Production deployment checklist

1) Secrets
- Set `JWT_SECRET` and `ADMIN_PASSWORD` in the production environment. Do not commit secrets.
- Recommended: use a secrets manager or environment variables injected by your host.

2) Node version
- Use Node 18.x LTS for best compatibility with `better-sqlite3` prebuilt binaries.
- The `server/package.json` contains an `engines` entry pinned to Node 18.

3) Build + Run (Docker)
- Build the image from project root:

```bash
docker build -t cheffs-app:latest .
```

- Run with a persistent volume for the sqlite DB and the required env vars:

```bash
docker run -d -p 4000:4000 \
  -v cheffs-data:/data \
  -e JWT_SECRET='your_jwt_secret' \
  -e ADMIN_PASSWORD='choose_a_strong_password' \
  cheffs-app:latest
```

- The container uses `DATA_DIR=/data/data.db` by default; the DB will be stored in the `cheffs-data` volume.

4) Non-Docker quick start
- Install Node 18.x and run from project root:

```powershell
# set envs (PowerShell)
$env:JWT_SECRET = 'your_jwt_secret'
$env:ADMIN_PASSWORD = 'choose_a_strong_password'
cd "C:\Users\theo3\Downloads\cheffs appli\server"
npm ci
npm run start:prod
```

5) Backups & Migration
- Back up `server/data.db` regularly (or the Docker volume) and keep DB dumps off-site.
- If migrating existing client localStorage to the server, export/import script should be run once server is live.

6) TLS
- Run behind TLS (reverse proxy like Nginx, Traefik, AWS ALB, etc.).
- Ensure `ALLOWED_ORIGINS` matches frontend origin.

7) Monitoring
- Add healthchecks to your orchestrator for `/health`.
- Monitor application logs and disk usage (sqlite DB grows over time).
