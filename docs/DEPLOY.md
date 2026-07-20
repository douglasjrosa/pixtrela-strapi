# Pixtrela Strapi — Production Deploy

## Public API

- URL: `https://strapi.pixtrela.ribermax.com.br`
- Admin: `https://strapi.pixtrela.ribermax.com.br/admin`

## Vercel (Next.js frontend)

Set these environment variables on Vercel:

| Variable | Value |
|----------|-------|
| `STRAPI_URL` | `https://strapi.pixtrela.ribermax.com.br` |
| `AUTH_SECRET` | Strong random secret (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | `true` |

After deploying the frontend, add the Vercel URL to Strapi `CORS_ORIGINS` in
`/var/www/pixtrela/strapi/.env` on the server (comma-separated), then restart:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Example:

```
CORS_ORIGINS=https://pixtrela.com.br,https://pixtrela.com,https://your-app.vercel.app
```

## GitHub Actions secrets

| Secret | Description |
|--------|-------------|
| `SERVER_HOST` | VPS IP (`179.0.179.210`) |
| `SERVER_USER` | `root` |
| `SSH_PRIVATE_KEY` | Deploy key private key (`pixtrela_deploy`) |

## Manual deploy on server

Build runs in GitHub Actions (2 GB VPS cannot compile Strapi in Docker).
On the server, only the runtime image is built from precompiled `dist/`:

```bash
cd /var/www/pixtrela/strapi
docker compose -f docker-compose.prod.yml up -d --build
```

The container entrypoint (`docker-entrypoint.sh`) creates `public/uploads` and
sets owner `node:node` (UID 1000) on every start, so uploads keep working after
deploys from Windows or tarball extracts.

For a local emergency deploy from your machine:

```bash
npm ci && npm run build
tar --exclude=node_modules --exclude=.git --exclude=public/uploads \
  --exclude=db/mysql-data --exclude=.env --exclude=db/.env -czf /tmp/deploy.tgz .
mv /tmp/deploy.tgz .
scp deploy.tgz root@179.0.179.210:/var/www/pixtrela/strapi/
ssh pixtrela-vps 'cd /var/www/pixtrela/strapi && tar xzf deploy.tgz && rm deploy.tgz && docker compose -f docker-compose.prod.yml up -d --build'
```

## Database backup

Daily at 23:59 via cron: `/var/www/pixtrela/strapi/db/db.sh`
