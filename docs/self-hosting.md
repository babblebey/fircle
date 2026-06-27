# Fircle Self-Hosting Guide

This guide covers:

- Single-node production self-hosting (primary path)
- Local and development self-hosting (secondary path)
- PaaS-oriented deployment flow (Railway, Render, Fly.io)

This guide does not cover HA, Kubernetes, or multi-region architecture.

## 1. Requirements

- Node.js 20+
- pnpm 10.20.0 (see packageManager in package.json)
- PostgreSQL database
- Cloudflare R2 bucket for media storage
- HTTPS-enabled deployment target for production

Recommended baseline for single-node production:

- 2 vCPU
- 2-4 GB RAM
- 20+ GB disk for app/runtime logs

## 2. Environment Variables

### Required in all environments

- DATABASE_URL
- STORAGE_DRIVER (currently r2)

### Required in production

- NODE_ENV=production
- AUTH_SECRET
- NEXT_PUBLIC_VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT

### Self-hosted storage env fallback (recommended for first deploy)

- R2_ACCOUNT_ID
- R2_BUCKET
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_PUBLIC_BASE_URL

Notes:

- In self-hosted mode, Fircle can read R2 credentials from env vars.
- You can later migrate to owner-managed credentials in Settings > Integrations.

### Optional email variables (ZeptoMail)

Only required when EMAIL_DRIVER=zeptomail:

- EMAIL_FROM_ADDRESS
- EMAIL_FROM_NAME
- ZEPTOMAIL_API_KEY
- ZEPTOMAIL_ACCOUNT_ID
- ZEPTOMAIL_API_BASE_URL (optional override)

### Tenant and domain flags

- SELF_HOSTED (default true)
- DOMAIN_VERIFICATION_ENABLED (default true)
- DOMAIN_VERIFICATION_TIMEOUT_MS (default 5000)
- DOMAIN_VERIFICATION_MAX_ATTEMPTS (default 3)
- DOMAIN_VERIFICATION_RETRY_DELAY_MS (default 500)

## 3. Production Deployment (PaaS-First)

These steps apply to Railway, Render, and Fly.io style deployments.

1. Provision a managed PostgreSQL database.
2. Provision Cloudflare R2 and create an API key with bucket access.
3. Set all required environment variables in your PaaS app.
4. Configure build and start commands:
   - Build: pnpm build
   - Start: pnpm start
5. Ensure migrations run on deploy:
   - Preferred release step: pnpm db:migrate
6. Deploy the app.
7. Open your deployment URL and complete first-time bootstrap at /auth/setup.

Important:

- SELF_HOSTED should remain true for private single-family deployments.
- AUTH_SECRET must be a strong random secret in production.
- Production requires all three VAPID variables, even if you are not actively testing push yet.

## 4. Local and Development Self-Hosting

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set environment variables in .env.
3. Start PostgreSQL:
   - Linux/macOS/WSL: ./start-database.sh
   - Windows native: use your own PostgreSQL instance
4. Apply schema:

   ```bash
   pnpm db:generate
   ```

   or

   ```bash
   pnpm db:push
   ```

5. Start app:

   ```bash
   pnpm dev
   ```

6. Open http://localhost:3000 and complete /auth/setup for fresh instances.

## 5. First-Time Bootstrap Flow

Bootstrap is available only when:

- SELF_HOSTED=true
- No family exists yet

Setup readiness checks run before bootstrap:

- Database connectivity (Prisma connect and SELECT 1)
- Auth secret presence
- R2 bucket readiness via HeadBucket
- VAPID configuration format and presence rules
- ZeptoMail auth probe when EMAIL_DRIVER=zeptomail

If you changed env vars while the server is already running, restart the app before retrying readiness.

## 6. Domain and Tenant Routing

Tenant resolution is based on explicit Domain records only.

- There is no fallback based on slug parsing alone.
- Unmapped hosts resolve to tenant-not-found.
- In production, unverified domains do not resolve tenant context.

Operational guidance:

1. Ensure your deployment host/domain is represented in Domain.
2. Keep one primary domain per family for canonical routing.
3. For custom domains, complete verification before expecting production routing.

Self-host bootstrap behavior:

- If no family exists and SELF_HOSTED=true, resolution returns bootstrap-required and routes to setup flow.

## 7. Security Baseline

- Terminate TLS at your PaaS edge or reverse proxy.
- Never commit secrets into source control.
- Rotate AUTH_SECRET, R2 keys, and email keys on a regular schedule.
- Restrict database ingress to your app network when possible.
- Keep dependency updates and security patches current.

## 8. Backups and Recovery

Minimum production policy:

- Daily PostgreSQL backup snapshots (or provider PITR if available)
- Daily verification that R2 bucket objects are reachable
- Periodic restore drill to a staging environment

Recovery checklist:

1. Restore database from latest valid backup.
2. Validate Domain mappings and owner account access.
3. Validate media accessibility from R2 public base URL.
4. Re-run smoke checks on setup-readiness dependent systems (DB, storage, push, email).

## 9. Operations and Upgrades

Upgrade flow:

1. Deploy code update.
2. Run pnpm db:migrate.
3. Run smoke checks:
   - Sign in and open feed
   - Upload media
   - Verify one notification flow

Routine maintenance:

- Dry-run orphan media cleanup:

   ```bash
   pnpm media:cleanup
   ```

- Delete orphans after review:

   ```bash
   pnpm media:cleanup:delete
   ```

Recommended cadence: schedule cleanup as a cron job (daily or weekly based on media volume).

## 10. Troubleshooting

### Setup readiness blocks on database

- Confirm DATABASE_URL is reachable from the runtime environment.
- Confirm database credentials and SSL mode match provider requirements.

### Setup readiness blocks on storage

- Verify R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.
- Confirm key permissions include bucket access.
- Confirm R2 bucket name and endpoint region configuration are correct.

### Setup readiness blocks on push

- Ensure NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT are all set together.
- Ensure VAPID_SUBJECT uses mailto: or http(s) format.

### Setup readiness blocks on email

- Confirm EMAIL_DRIVER=zeptomail.
- Confirm ZEPTOMAIL_API_KEY and ZEPTOMAIL_ACCOUNT_ID are valid.
- If network is restricted, allow outbound access to ZeptoMail API base URL.

### Requests resolve to tenant-not-found

- Confirm host header matches a Domain.domain entry exactly.
- In production, confirm verifiedAt is set for the domain.
- Confirm DNS points to the correct deployment target.

## 11. Related Guides

- Cloud storage deployment guide: docs/cloud-storage-deployment.md
- Self-hosted storage migration guide: docs/self-hosted-storage-migration.md
