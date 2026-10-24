# EMS — Employee Management System

One Node project. The **React app** and the **REST API** run on the **same port**:

| URL | Served by |
|---|---|
| `/api/*` | Express API (`backend/`) |
| `/uploads/*` | Uploaded profile logos |
| everything else | React app (`frontend/`, client-side routes like `/signin`, `/users`) |

## Commands (run from the project root)

```bash
npm install        # one install: API + app dependencies
npm run setup      # migrate + seed (roles, admin@mail.com / password)
npm run dev        # development: http://localhost:5000 with hot reload for React, auto-restart for the API
npm start          # production: builds the React app, then serves app + API on http://localhost:5000
```

| Script | Does |
|---|---|
| `npm run dev` | Express + Vite middleware (HMR) on `PORT` |
| `npm start` | `npm run build` then `npm run serve` |
| `npm run build` | Builds the React app to `frontend/dist` |
| `npm run serve` | Serves the API + `frontend/dist` in production mode (no rebuild) |
| `npm run migrate` / `migrate:rollback` / `migrate:status` | Knex migrations |
| `npm run migrate:make -- name` | New migration |
| `npm run seed` | Run seeders |
| `npm run setup` | Migrate + seed |
| `npm run db:reset` | Roll back all, migrate + seed |

## Structure

```
EMS/
├─ package.json          # single package.json for everything
├─ .env                  # config (copy from .env.example); backend/.env is also read
├─ nodemon.json          # dev auto-restart for the API
├─ backend/
│  ├─ knexfile.js
│  ├─ database/migrations, database/seeds
│  ├─ uploads/profile/
│  └─ src/
│     ├─ server.js       # starts one HTTP server, mounts API + React app
│     ├─ app.js          # Express app with /api and /uploads
│     ├─ frontend.js     # Vite middleware (dev) or static frontend/dist (prod)
│     ├─ config/ controllers/ middleware/ routes/ services/ utils/ validators/
└─ frontend/
   ├─ vite.config.mjs
   ├─ index.html, public/
   └─ src/               # React app (TailAdmin design)
```

## Database

Set in `.env`:
1. `DATABASE_URL` set → **Postgres** (e.g. your Neon database).
2. Otherwise `DB_CLIENT=sqlite` (default) → `backend/database/ems.sqlite`.
3. Or `DB_CLIENT=mysql2` with the `DB_*` values.

API reference: `backend/README.md`.
