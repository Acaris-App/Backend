# Backend Operations Guide

This is the single deployment runbook for the Backend services. Run commands from
`D:\Skripsi\Code\Backend` unless a command says otherwise. The deployed Cloud Run
region is `asia-southeast2`; Artifact Registry repository is `backend`.

## Services

| Source path | Cloud Build config | Cloud Run service | Image name |
| --- | --- | --- | --- |
| `services/auth-service` | `services/auth-service/cloudbuild.yaml` | `acaris-auth` | `auth-service` |
| `services/consultation-service` | `services/consultation-service/cloudbuild.yaml` | `acaris-consultation` | `consultation-service` |
| `services/ai-document-service` | `services/ai-document-service/cloudbuild.yaml` | `acaris-ai-document` | `ai-document-service` |
| `services/docs-service` | `services/docs-service/cloudbuild.yaml` | `acaris-docs` | `acaris-docs` |

The public routed application paths are `/api/auth/*`, `/api/consultations/*`,
`/api/documents/*`, and `/docs`. Test each Cloud Run service directly as part of
deployment verification because the load balancer route is a separate concern.

## Prerequisites

Authenticate an operator account, select the intended project, and enable APIs once
per project. Do not use a personal project by mistake.

```powershell
gcloud auth login
gcloud config set project acaris-app
gcloud services enable cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com
$project = gcloud config get-value project
```

The Cloud Build service account and the Cloud Run runtime service account must have
the required Artifact Registry, Cloud Run deploy, and Secret Manager Secret Accessor
permissions. Confirm access before a release:

```powershell
gcloud secrets versions access latest --secret=JWT_SECRET --project=$project | Out-Null
```

## Secret Manager

Create secrets before the first deployment and add a version only through a secure
operator shell. Secret values must never be committed to Git, added to
`cloudbuild.yaml`, copied into `.env` files, included in logs, or placed in n8n
workflow JSON.

| Secret name | Required by |
| --- | --- |
| `JWT_SECRET` | Auth, Consultation, AI Document |
| `DB_PASSWORD` | Auth, Consultation, AI Document |
| `EMAIL_PASS` | Auth, Consultation, AI Document |
| `REDIS_URL` | Auth, Consultation, AI Document |
| `N8N_BASE_URL` | AI Document |
| `N8N_DOCUMENT_EXTRACT_WEBHOOK_URL` | AI Document |
| `N8N_CHATBOT_WEBHOOK_URL` | AI Document |
| `N8N_GENERATE_SUMMARY_WEBHOOK_ID` | AI Document |
| `N8N_CLOSE_SESSION_WEBHOOK_ID` | AI Document |
| `N8N_ACADEMIC_CALLBACK_SECRET` | AI Document and n8n academic callbacks |

Create a missing secret, then add its value without echoing it:

```powershell
gcloud secrets create N8N_ACADEMIC_CALLBACK_SECRET --replication-policy=automatic --project=$project
$secret = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$secret | gcloud secrets versions add N8N_ACADEMIC_CALLBACK_SECRET --data-file=- --project=$project
Remove-Variable secret
```

`N8N_ACADEMIC_CALLBACK_SECRET` is mandatory for `acaris-ai-document`. Configure
the identical value in the protected n8n credential or variable used by its HTTP
Request nodes. n8n must send it as `x-academic-callback-secret` to
`POST /api/academic/internal/import-khs` and
`POST /api/academic/internal/import-curriculum`. Never give n8n direct database
write credentials for academic tables.

## Deploy

Each command submits the repository root as Cloud Build source, so the paths in the
checked-in configurations resolve correctly. Run the command for only the service
being released; repeat for all four services when releasing the complete Backend.

```powershell
gcloud builds submit . --config=services/auth-service/cloudbuild.yaml --project=$project
gcloud builds submit . --config=services/consultation-service/cloudbuild.yaml --project=$project
gcloud builds submit . --config=services/ai-document-service/cloudbuild.yaml --project=$project
gcloud builds submit . --config=services/docs-service/cloudbuild.yaml --project=$project
```

Cloud Build deploys images tagged with its build `$SHORT_SHA`. Do not replace the
configured secret bindings with literal values during a manual deploy.

## Production Academic Migrations

Database migration is a separate, deliberate production operation. Do not run it
as part of a Cloud Run deployment and do not run seed or backfill before the schema
migrations succeed. Take and verify a Cloud SQL backup first, then use a restricted
operator shell with `psql` that can reach the production database.

Set connection values in that process only. `DB_HOST`, `DB_PORT`, `DB_USER`, and
`DB_NAME` currently used by Cloud Run are `34.101.86.214`, `5432`, `acaris_user`,
and `acaris_db` respectively.

```powershell
$env:PGHOST = '34.101.86.214'
$env:PGPORT = '5432'
$env:PGUSER = 'acaris_user'
$env:PGDATABASE = 'acaris_db'
$env:PGPASSWORD = gcloud secrets versions access latest --secret=DB_PASSWORD --project=$project
psql -v ON_ERROR_STOP=1 -f migrations/20260729_create_academic_schema.sql
psql -v ON_ERROR_STOP=1 -f migrations/20260729_add_student_curriculum_assignment.sql
psql -v ON_ERROR_STOP=1 -f migrations/20260729_fix_academic_imports_and_summary.sql
psql -v ON_ERROR_STOP=1 -f migrations/20260729_support_plus_minus_grades.sql
psql -v ON_ERROR_STOP=1 -f migrations/20260729_limit_plus_grades_only.sql
psql -v ON_ERROR_STOP=1 -f migrations/20260729_preserve_document_delete_compatibility.sql
Remove-Item Env:PGPASSWORD
```

Stop immediately on an error. Record the executed filenames and deployment/build
IDs in the release ticket, not passwords. The migration files include preflight and
transaction protections; do not remove `ON_ERROR_STOP`.

## Seed And Backfill

After the production academic migrations, seed the curriculum from an approved
environment that has the same database environment variables and secret access as
the AI Document service. Run seeds intentionally and review their output.

```powershell
Push-Location services/ai-document-service
$env:NODE_ENV = 'production'
npm ci
npm run seed:curriculum
npm run seed:curriculum-2020
npm run backfill:academic
Pop-Location
```

`backfill:academic` is idempotent by source document and only processes KHS records
with `isi_teks_dokumen`. Re-run n8n extraction for documents without valid extraction
output; do not manufacture grades or backfill empty data. The legacy lecturer and
role SQL seeds in `migrations/` are separate data operations and must not be run as
part of the academic seed unless explicitly approved.

## Verification

Verify each direct Cloud Run endpoint after deployment. This checks the deployed
revision without relying on the external load balancer.

```powershell
$services = 'acaris-auth', 'acaris-consultation', 'acaris-ai-document', 'acaris-docs'
$services | ForEach-Object {
  $url = gcloud run services describe $_ --region=asia-southeast2 --project=$project --format='value(status.url)'
  Invoke-RestMethod "$url/health"
}
```

Expected services in the responses are `acaris-auth`, `acaris-consultation`,
`acaris-ai-document`, and `acaris-backend` for docs. Verify the public docs route:

```powershell
Invoke-WebRequest 'https://acaris.my.id/docs' -UseBasicParsing
```

After academic migration, seed, and callback/backfill work, use read-only SQL:

```powershell
psql -c 'SELECT COUNT(*) FROM pengambilan_mata_kuliah;'
psql -c 'SELECT * FROM v_nilai_efektif WHERE mahasiswa_user_id = <user_id>;'
psql -c 'SELECT * FROM v_ringkasan_akademik WHERE mahasiswa_user_id = <user_id>;'
```

Confirm an import retry does not duplicate rows and that callbacks returning `422`
are investigated rather than treated as successful workflow runs.

## Rollback

Cloud Run rollback changes traffic only; it does not roll back a database migration,
seed, or backfill. For application rollback, list revisions, choose the last known
good revision, send all traffic to it, then repeat the health check.

```powershell
$service = 'acaris-ai-document'
gcloud run revisions list --service=$service --region=asia-southeast2 --project=$project
$revision = '<known-good-revision>'
gcloud run services update-traffic $service --to-revisions="$revision=100" --region=asia-southeast2 --project=$project
$url = gcloud run services describe $service --region=asia-southeast2 --project=$project --format='value(status.url)'
Invoke-RestMethod "$url/health"
```

For a database incident, stop the affected release, preserve evidence, and use the
approved Cloud SQL backup/restore procedure. Do not attempt to reverse production
migrations by rerunning arbitrary SQL.
