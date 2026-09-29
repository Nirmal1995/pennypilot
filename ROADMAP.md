# Roadmap

Each item is sized to be one feature branch, one pull request and one pipeline run. They are borrowed from what popular open source finance trackers (ExpenseOwl, Actual Budget, Firefly III) ship, so the app grows the way a real product would.

Suggested flow per item: branch, code, open PR (pipeline runs tests only), merge to `main` (pipeline deploys), bump `VERSION`, update `CHANGELOG.md`.

## Small (good first pushes)

- [ ] **v1.1.0 Dark mode toggle** in the header, remembered per browser
- [ ] **v1.2.0 CSV export** `GET /api/transactions/export?month=` plus a download button
- [ ] **v1.3.0 Pagination** on the transactions table (API already supports `limit` and `offset`)
- [ ] **v1.4.0 Currency setting** (EUR, GBP, USD) stored in a new `settings` table (first real migration)

## Medium

- [ ] **v1.5.0 Tags** on transactions (many to many table, filter by tag)
- [ ] **v1.6.0 Monthly budgets** per category with progress bars and an over budget warning
- [ ] **v1.7.0 Recurring transactions** (rent, salary) created by a Kubernetes CronJob that calls the API
- [ ] **v1.8.0 CSV import** from a bank statement with a preview step
- [ ] **v1.9.0 Trends chart** showing the last 6 months of income vs spend

## Large

- [ ] **v2.0.0 User accounts** (JWT auth, every row owned by a user). Breaking change, good for practising a careful migration and rollback
- [ ] **v2.1.0 Receipt uploads** stored in a Cloud Storage bucket (Workload Identity, no keys)

## Pipeline and platform upgrades (no app change needed)

- [ ] Fail the build on HIGH/CRITICAL Trivy findings
- [ ] Add a `staging` namespace and deploy there first, promote to prod with a manual `input` step
- [ ] Move Postgres to Cloud SQL with the Cloud SQL Auth Proxy sidecar
- [ ] Replace the service account key with Workload Identity Federation
- [ ] Add Prometheus + Grafana (kube-prometheus-stack) scraping `/metrics`, with an error rate alert
- [ ] Switch deploys to Helm or Argo CD (GitOps)
- [ ] SonarQube or ESLint quality gate
- [ ] Load test with k6 as a pipeline stage and watch the HPA scale
