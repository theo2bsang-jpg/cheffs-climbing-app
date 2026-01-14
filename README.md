# Cheffs Climbing App

A modern full-stack climbing application with spray wall visualization, boulder tracking, and performance analytics.

## Features

- 🧗‍♂️ **Boulder Management**: Create and manage climbing boulders with visual hold selection
- 🏔️ **Spray Wall Support**: Define holds with photo annotations, create boulders and conti boucles
- 📊 **Performance Tracking**: Track ascents, tests, and personal records
- 🔐 **Authentication**: Secure user accounts with JWT tokens and role-based access
- 🎨 **Modern UI**: Built with React, Tailwind CSS, and Radix UI components
- 💾 **SQLite Database**: Persistent storage with offline capabilities

## Tech Stack

**Frontend:**
- React 18 + Vite
- React Query for data fetching
- Tailwind CSS + Radix UI
- Lucide Icons

**Backend:**
- Node.js + Express
- better-sqlite3
- JWT authentication
- bcryptjs for password hashing

## Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Start backend server:**
   ```bash
   cd server
   npm run dev
   ```
   Server runs on http://localhost:4000

3. **Start frontend dev server:**
   ```bash
   npm run dev
   ```
   Frontend runs on http://localhost:5173

4. **Default admin credentials:**
   - Email: `admin@example.com`
   - Password: `admin`

## Production Deployment

See [RENDER_DEPLOY.md](./RENDER_DEPLOY.md) for detailed Render deployment instructions.

**Quick check before deploying:**
```bash
node check-deploy.js
```

### Environment Variables

Copy `server/.env.production` and set:
- `JWT_SECRET` - Strong random string for JWT signing
- `ADMIN_PASSWORD` - Secure admin password
- `ALLOWED_ORIGINS` - Your frontend URL (comma-separated)
- `DATA_DIR` - Path for SQLite database

## Project Structure

- `src/` - Frontend React application
  - `api/` - Data fetching and entity management
  - `components/` - Reusable UI components
  - `pages/` - Application pages and routes
  - `utils/` - Utility functions
- `server/` - Backend Node.js API
  - `auth.js` - JWT authentication middleware
  - `db.js` - SQLite database layer
  - `index.js` - Express server and routes
- `render.yaml` - Render deployment configuration
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions

For more information and support, please consult project documentation or contact the project maintainers.

````