# Cheffs Climbing App - Render Deployment Guide

## Prerequisites
- GitHub account with your code pushed
- Render account (free at https://render.com)

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to https://dashboard.render.com
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `render.yaml` and create both services automatically

3. **Set Environment Variables:**
   In the Render dashboard, set these for the backend service:
   - `ADMIN_PASSWORD`: Your secure admin password
   - `ALLOWED_ORIGINS`: Your frontend URL (e.g., `https://cheffs-frontend.onrender.com`)

### Option 2: Manual Setup

#### Backend (Node.js Service)

1. **Create Web Service:**
   - New → Web Service
   - Connect GitHub repo
   - Name: `cheffs-api`
   - Runtime: Node
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - Plan: Free

2. **Add Disk for Database:**
   - In service settings → Disks
   - Add disk: Mount path `/data`, Size 1GB

3. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=4000
   JWT_SECRET=<generate-random-secret>
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=<your-secure-password>
   DATA_DIR=/data/data.db
   COOKIE_NAME=cheffs_token
   REFRESH_COOKIE_NAME=cheffs_refresh
   ALLOWED_ORIGINS=<your-frontend-url>
   ```

#### Frontend (Static Site)

1. **Create Static Site:**
   - New → Static Site
   - Connect same GitHub repo
   - Name: `cheffs-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

2. **Add Rewrite Rule:**
   - In Static Site settings → Redirects/Rewrites
   - Source: `/*`
   - Destination: `/index.html`
   - Action: Rewrite

3. **Update API URL:**
   After backend deploys, update your frontend API calls to use:
   `https://cheffs-api.onrender.com/api`

## Post-Deployment

1. **Test Backend:** Visit `https://cheffs-api.onrender.com/api/users/me`
2. **Test Frontend:** Visit your frontend URL
3. **Login:** Use the admin credentials you set

## Important Notes

- **First request may be slow** (free tier spins down after 15 min inactivity)
- **Database persists** on the mounted disk
- **HTTPS is automatic** on Render
- **Update ALLOWED_ORIGINS** to include your frontend domain for CORS

## Troubleshooting

- Check service logs in Render dashboard
- Verify environment variables are set correctly
- Ensure ALLOWED_ORIGINS includes your frontend URL
- Database initializes automatically on first run

## Alternative: Single Service Deployment

You can also serve the frontend from the backend:

1. Build frontend locally: `npm run build`
2. Copy `dist/` to `server/public/`
3. In server/index.js, add: `app.use(express.static('public'))`
4. Deploy only the backend service

This uses fewer resources but requires manual rebuilds.
