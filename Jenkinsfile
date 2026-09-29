// PennyPilot CI/CD pipeline
//
// Every push:      lint, unit + integration tests, Docker build, image scan
// main branch:     push to Artifact Registry, deploy to GKE, smoke test, auto rollback on failure
//
// Jenkins needs: Docker Pipeline, Git, JUnit, Credentials Binding, Timestamper plugins
// and docker, gcloud (+ gke-gcloud-auth-plugin), kubectl, kustomize on the agent.
// The image in jenkins/Dockerfile has all of these.
//
// Credentials to create in Jenkins:
//   gcp-sa-key            Secret file  (JSON key for jenkins-deployer service account)
//   pennypilot-db-password Secret text (password for the in-cluster Postgres)

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  // Local Jenkins cannot receive GitHub webhooks, so poll. Remove once you expose Jenkins.
  triggers {
    pollSCM('H/5 * * * *')
  }

  environment {
    // ---- edit these for your project ----
    GCP_PROJECT_ID = 'your-gcp-project-id'
    GCP_REGION     = 'europe-west1'
    GKE_CLUSTER    = 'pennypilot-gke'
    GKE_ZONE       = 'europe-west1-b'
    APP_URL        = 'http://YOUR_STATIC_IP'      // later: https://app.yourdomain.com
    KUSTOMIZE_DIR  = 'k8s/base'                   // later: k8s/overlays/https
    DEPLOY_ENABLED = 'false'                      // set to 'true' once GCP and credentials are ready
    // --------------------------------------
    REGISTRY         = "${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/pennypilot"
    K8S_NAMESPACE    = 'pennypilot'
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm-cache"
  }

  stages {
    stage('Prepare') {
      steps {
        script {
          env.GIT_SHORT   = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
          env.APP_VERSION = readFile('VERSION').trim()
          env.IMAGE_TAG   = "${env.APP_VERSION}-${env.GIT_SHORT}"
          env.IS_MAIN     = ((env.BRANCH_NAME ?: env.GIT_BRANCH ?: '') ==~ /(origin\/)?main/).toString()
          currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.IMAGE_TAG}"
        }
        echo "Building ${env.IMAGE_TAG} (main branch: ${env.IS_MAIN})"
      }
    }

    stage('Test') {
      parallel {
        stage('Backend') {
          steps {
            script {
              // Throwaway Postgres for integration tests
              docker.image('postgres:16-alpine').withRun(
                '-e POSTGRES_USER=pennypilot -e POSTGRES_PASSWORD=pennypilot -e POSTGRES_DB=pennypilot_test'
              ) { db ->
                docker.image('postgres:16-alpine').inside("--link ${db.id}:db") {
                  sh 'for i in $(seq 1 30); do pg_isready -h db -U pennypilot && break; sleep 1; done'
                }
                docker.image('node:22-alpine').inside(
                  "--link ${db.id}:db -e TEST_DATABASE_URL=postgres://pennypilot:pennypilot@db:5432/pennypilot_test"
                ) {
                  dir('backend') {
                    sh 'npm ci --no-audit --no-fund'
                    sh 'npm run lint'
                    sh 'npm run test:ci'
                  }
                }
              }
            }
          }
          post {
            always { junit allowEmptyResults: true, testResults: 'backend/reports/*.xml' }
          }
        }

        stage('Frontend') {
          agent {
            docker {
              image 'node:22-alpine'
              reuseNode true
            }
          }
          steps {
            dir('frontend') {
              sh 'npm ci --no-audit --no-fund'
              sh 'npm run lint'
              sh 'npm run test:ci'
              sh 'npm run build'
            }
          }
          post {
            always { junit allowEmptyResults: true, testResults: 'frontend/reports/*.xml' }
          }
        }
      }
    }

    stage('Build images') {
      steps {
        sh """
          docker build \
            --build-arg APP_VERSION=${APP_VERSION} --build-arg GIT_SHA=${GIT_SHORT} \
            -t ${REGISTRY}/api:${IMAGE_TAG} backend
          docker build \
            --build-arg APP_VERSION=${APP_VERSION} --build-arg GIT_SHA=${GIT_SHORT} \
            -t ${REGISTRY}/web:${IMAGE_TAG} frontend
        """
      }
    }

    stage('Scan images') {
      steps {
        // Report only for now. Change --exit-code to 1 to fail builds on HIGH/CRITICAL findings.
        sh """
          for img in api web; do
            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache \
              aquasec/trivy:latest image --quiet --severity HIGH,CRITICAL --exit-code 0 \
              --ignore-unfixed ${REGISTRY}/\$img:${IMAGE_TAG}
          done
        """
      }
    }

    stage('Push images') {
      when { expression { env.IS_MAIN == 'true' && env.DEPLOY_ENABLED == 'true' } }
      steps {
        withCredentials([file(credentialsId: 'gcp-sa-key', variable: 'GCP_KEY')]) {
          sh """
            gcloud auth activate-service-account --key-file="\$GCP_KEY" --quiet
            gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev --quiet
            docker push ${REGISTRY}/api:${IMAGE_TAG}
            docker push ${REGISTRY}/web:${IMAGE_TAG}
          """
        }
      }
    }

    stage('Deploy to GKE') {
      when { expression { env.IS_MAIN == 'true' && env.DEPLOY_ENABLED == 'true' } }
      steps {
        withCredentials([
          file(credentialsId: 'gcp-sa-key', variable: 'GCP_KEY'),
          string(credentialsId: 'pennypilot-db-password', variable: 'DB_PASSWORD')
        ]) {
          sh """
            gcloud auth activate-service-account --key-file="\$GCP_KEY" --quiet
            gcloud container clusters get-credentials ${GKE_CLUSTER} --zone ${GKE_ZONE} --project ${GCP_PROJECT_ID}

            kubectl get namespace ${K8S_NAMESPACE} >/dev/null 2>&1 || kubectl create namespace ${K8S_NAMESPACE}
            kubectl -n ${K8S_NAMESPACE} create secret generic pennypilot-db \
              --from-literal=username=pennypilot --from-literal=password="\$DB_PASSWORD" \
              --dry-run=client -o yaml | kubectl apply -f -

            cd k8s/base
            kustomize edit set image \
              pennypilot-api=${REGISTRY}/api:${IMAGE_TAG} \
              pennypilot-web=${REGISTRY}/web:${IMAGE_TAG}
            cd - >/dev/null

            kubectl apply -k ${KUSTOMIZE_DIR}
            kubectl -n ${K8S_NAMESPACE} rollout status statefulset/postgres --timeout=180s
            kubectl -n ${K8S_NAMESPACE} rollout status deployment/pennypilot-backend --timeout=180s
            kubectl -n ${K8S_NAMESPACE} rollout status deployment/pennypilot-frontend --timeout=180s
          """
        }
        script { env.DEPLOYED = 'true' }
      }
    }

    stage('Smoke test') {
      when { expression { env.IS_MAIN == 'true' && env.DEPLOY_ENABLED == 'true' } }
      steps {
        // The load balancer can take a minute to pick up new pods, so retry.
        retry(10) {
          sleep time: 10, unit: 'SECONDS'
          sh """
            curl -fsS ${APP_URL}/api/version | tee version.json
            grep -q '"gitSha":"${GIT_SHORT}"' version.json
            curl -fsS -o /dev/null ${APP_URL}/
          """
        }
      }
    }
  }

  post {
    failure {
      script {
        if (env.DEPLOYED == 'true') {
          echo 'Deployment failed its checks, rolling back'
          sh """
            kubectl -n ${K8S_NAMESPACE} rollout undo deployment/pennypilot-backend || true
            kubectl -n ${K8S_NAMESPACE} rollout undo deployment/pennypilot-frontend || true
          """
        }
      }
    }
    success {
      echo "PennyPilot ${env.IMAGE_TAG} is green"
    }
    always {
      sh 'docker image prune -f >/dev/null 2>&1 || true'
    }
  }
}
