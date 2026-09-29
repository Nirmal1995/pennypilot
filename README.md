# PennyPilot

A small personal finance tracker: log expenses and income, organise them into categories, and see where your money went each month.

It is a classic three tier web app built to be deployed with a real CI/CD pipeline (Jenkins, Docker, Artifact Registry, GKE).

| Tier | Tech | Folder |
|------|------|--------|
| Presentation | React 18 + Vite, served by nginx | `frontend/` |
| Application | Node.js 22 + Express REST API | `backend/` |
| Data | PostgreSQL 16 | `backend/migrations/`, `k8s/base/postgres.yaml` |

```
Browser ──> GCP HTTP(S) Load Balancer (GKE Ingress)
              ├── /api/*  ──> pennypilot-backend (Express, 2+ pods, HPA)
              │                     └──> postgres (StatefulSet + persistent disk)
              └── /*      ──> pennypilot-frontend (nginx, 2 pods)
```

## Features (v1.0.0)

- Transactions: create, edit, delete, filter by month, type, category and text search
- Categories: create, edit, delete, colour coded, separate expense and income types
- Dashboard: monthly income, spend, net, spending by category, recent activity
- Ops: `/healthz` (liveness), `/readyz` (DB readiness), `/metrics` (Prometheus), `/api/version` (build info shown in the UI footer so you can see each deploy land)
- DB migrations run automatically on startup, guarded by a Postgres advisory lock so multiple replicas are safe
- Graceful shutdown on SIGTERM for zero downtime rolling updates

## Run it locally

With Docker:

```bash
docker compose up --build
# app: http://localhost:3000   api: http://localhost:8080/api/version
```

Without Docker (needs Node 22 and a Postgres on localhost:5432):

```bash
cd backend && npm install && npm run dev      # API on :8080
cd frontend && npm install && npm run dev     # UI on :5173, proxies /api to :8080
```

## Tests

```bash
docker compose up -d db
docker compose exec db createdb -U pennypilot pennypilot_test
cd backend && npm test          # integration tests against real Postgres
cd frontend && npm test         # component and unit tests (Vitest)
```

Both have `npm run lint` and `npm run test:ci` (writes JUnit XML to `reports/` for Jenkins).

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/transactions` | `?month=YYYY-MM&type=expense&categoryId=1&q=tesco&limit=100&offset=0` |
| GET | `/api/transactions/:id` | |
| POST | `/api/transactions` | `{ description, amount, type, categoryId?, occurredOn?, notes? }` |
| PUT | `/api/transactions/:id` | partial update |
| DELETE | `/api/transactions/:id` | |
| GET/POST | `/api/categories` | `{ name, type?, color? }` |
| PUT/DELETE | `/api/categories/:id` | deleting a category leaves its transactions uncategorised |
| GET | `/api/summary?month=YYYY-MM` | totals and per category breakdown |
| GET | `/api/version` | `{ version, gitSha, environment }` |

## Deploying to GCP

### 1. Infrastructure (Terraform)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # set project_id
terraform init && terraform apply
```

Creates: VPC, zonal GKE cluster (1 x e2-standard-2 Spot node), Artifact Registry repo with cleanup policies, a global static IP (`pennypilot-ip`), and a `jenkins-deployer` service account.

Create the Jenkins key (kept out of Terraform state on purpose):

```bash
gcloud iam service-accounts keys create jenkins-sa.json \
  --iam-account "$(terraform output -raw jenkins_service_account)"
```

### 2. Jenkins

```bash
cd jenkins
docker compose up -d --build              # http://localhost:8081
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Then in Jenkins:

1. Add credentials: `gcp-sa-key` (Secret file, the `jenkins-sa.json`) and `pennypilot-db-password` (Secret text).
2. New Item, Pipeline, "Pipeline script from SCM", point it at your GitHub repo, branch `*/main`, script path `Jenkinsfile`.
3. Edit the `environment` block at the top of the `Jenkinsfile` (project ID, `APP_URL` = the static IP from `terraform output ingress_ip`).

### 3. Pipeline stages

| Stage | Runs on | What it does |
|-------|---------|--------------|
| Prepare | all branches | computes image tag `VERSION-gitsha` |
| Test (parallel) | all branches | backend lint + integration tests with a throwaway Postgres container, frontend lint + tests + build |
| Build images | all branches | multi stage Docker builds for api and web |
| Scan images | all branches | Trivy, report only (flip `--exit-code` to 1 to enforce) |
| Push images | main | pushes to Artifact Registry |
| Deploy to GKE | main | creates DB secret, `kustomize edit set image`, `kubectl apply -k`, waits for rollouts |
| Smoke test | main | checks `/api/version` returns the new git SHA |
| post failure | main | `kubectl rollout undo` if the deploy was applied |

### 4. HTTPS with your own domain (optional)

1. Point an A record (for example `app.yourdomain.com`) at the static IP.
2. Put the domain in `k8s/overlays/https/managed-cert.yaml`.
3. Set `KUSTOMIZE_DIR = 'k8s/overlays/https'` and `APP_URL = 'https://app.yourdomain.com'` in the Jenkinsfile.

Google provisions the certificate once DNS resolves (can take up to an hour).

### Cost control

The GKE free tier credit covers the management fee of one zonal cluster, so the main costs are the Spot node, the load balancer and the disk. Run `terraform destroy` when you are not practising.

## Versioning

`VERSION` holds the app version. Bump it with each feature (see `ROADMAP.md`) and add a line to `CHANGELOG.md`. The version and git SHA show up in the UI footer, so you can watch each deploy go live.
