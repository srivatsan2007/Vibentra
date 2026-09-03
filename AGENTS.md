# Workspace Rules for Vibentra

## 🔒 Scope Boundary & Authorization

Per user directive on 2026-09-03:
1. **Frontend Migration Authorized:**
   - Safely back up the old `frontend/` directory to `frontend_old_backup/`.
   - Replace the UI inside `frontend/` with the new modern UI from `Vibentra_kotlin/web/` without touching backend logic.

2. **Strictly Protected Areas (DO NOT TOUCH):**
   - **`backend/`**: Do not modify any backend files or server logic.
   - **`api/`**, **`Portfolio/`**: Must remain completely untouched.
   - Root configuration and server logic must remain safe.
