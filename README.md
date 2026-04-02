# Payroll System

A professional payroll and employee management platform built with Django REST Framework and React. The application is designed for internal HR, payroll, and finance teams that need a single workspace for employee records, payslip generation, approvals, audit history, and employee self-service access.

## Highlights

- Single-link application served through Django at `/`
- Role-based access for admin and employee users
- Employee directory, profile views, and edit flow
- Payslip generation with approval and issuance workflow
- Audit trail for approval, issuance, and download activity
- PDF payslip export
- Payroll activity feed and in-app notifications
- Search, filtering, pagination, and payroll register view
- Bulk payslip approve and issue actions
- CSV export for payroll register

## Tech Stack

- Backend: Django 5, Django REST Framework, Simple JWT
- Frontend: React 19, Vite, React Router
- PDF generation: ReportLab
- Database: SQLite for local development

## MCP Support

This repository includes an `mcp/` directory to make the project MCP-ready for local development and agent-assisted workflows.

Included now:

- example MCP server definitions for filesystem access
- example MCP server definitions for git-aware project access
- example MCP server definitions for SQLite database inspection
- documentation for setting up local-only MCP configuration safely

Current status:

- the project includes MCP configuration scaffolding in the repository
- this is intended for development tooling and engineering workflows
- it is not yet exposed as a user-facing feature inside the payroll UI

See:

- `mcp/README.md`
- `mcp/servers.example.json`

## Project Structure

```text
payslip-app/
├─ mcp/
├─ backend/
│  ├─ apps/
│  │  ├─ employees/
│  │  ├─ salary_slips/
│  │  └─ users/
│  ├─ core/
│  ├─ static/
│  ├─ templates/
│  └─ manage.py
└─ frontend/
   ├─ src/
   ├─ public/
   └─ vite.config.js
```

## Local Setup

### 1. Backend

```powershell
Set-Location "C:\Users\gouri\workspace\payslip-app\backend"
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py seed_demo_data
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

### 2. Frontend development mode

Use this only if you want separate frontend hot reload during development. The production-style single-link setup is already served by Django after build.

```powershell
Set-Location "C:\Users\gouri\workspace\payslip-app\frontend"
npm install
npm run dev
```

### 3. Single-link production-style build

Build the frontend so Django can serve the application from one URL:

```powershell
Set-Location "C:\Users\gouri\workspace\payslip-app\frontend"
npm install
npm run build
```

Then run Django:

```powershell
Set-Location "C:\Users\gouri\workspace\payslip-app\backend"
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Open:

- App: `http://127.0.0.1:8000/`
- Login: `http://127.0.0.1:8000/login`
- Admin: `http://127.0.0.1:8000/admin/`

## Demo Accounts

- Admin: `demo.admin` / `Admin@123`
- Employee: `demo.employee` / `Employee@123`

## Key Workflows

### Admin

- Log in as admin
- Onboard or edit employees
- Generate payslips
- Approve and issue payslips
- Export payslips as PDF
- Use the payroll register for search, filtering, bulk actions, and CSV export

### Employee

- Log in with employee access
- View self-service dashboard
- Open personal profile
- Review recent payslips
- Download or print issued payroll documents

## API Areas

- `/api/auth/`
- `/api/employees/`
- `/api/payslips/`

## Verification

The project has been validated locally with:

- `manage.py check`
- `npm run build`

## Notes

- The repository excludes local SQLite data, virtual environments, and `node_modules`.
- If you change frontend code and want the single-link Django version updated, run `npm run build` again inside `frontend`.
