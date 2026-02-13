# Proserve Help Desk - Enterprise Backend

A robust FastAPI backend designed for enterprise support management with advanced security, AI integration, and real-time monitoring.

## 🚀 Key Features

- **Advanced Security**: Rate limiting, IP blocking, CSRF protection, and mandatory 2FA for staff.
- **AI Integration**: AI-powered ticket analysis, tech-co-pilot guides, and sentiment detection.
- **Real-time Engine**: WebSocket support for live chat and notifications.
- **Enterprise Grade**: PostgreSQL support, role-based access control, and detailed audit logging.

## 🛠️ Setup & Installation

1. **Environment Setup**:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```
   *Note: Dependencies have been updated to address security vulnerabilities (CVE-2026-0994, CVE-2025-4565, CVE-2024-47874).*
   *Migration Note (Feb 2026): Switched from `google-generativeai` to `google-genai` SDK. Models updated to `gemini-2.0-flash`.*

2. **Configuration**:
   Copy `.env.example` to `.env` and update your secret keys, database credentials, and API keys.

3. **Database Migrations**:
   ```bash
   alembic upgrade head
   ```

4. **Run Server**:
   ```bash
   uvicorn main:app --reload
   ```

## 🔐 Security Implementation

This project follows "Defense in Depth" principles:
- **Sanitized Inputs**: All user/AI content is sanitized using DOMPurify (frontend) and strict schema validation (backend).
- **Authentication**: JWT tokens with secure expiration + Password Pepper & Salting (Argon2/Bcrypt).
- **MFA**: Mandatory 2FA for Admin/Manager roles using TOP-based TOTP.
- **Network Safety**: Middleware protection against brute-force (IP blocking) and rate limiting.
- **Audit Logs**: Every administrative action is logged for compliance.

## 📡 API Documentation

Access the interactive API documentation at:
- **Swagger UI**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/health/status` (Includes DB connectivity check)

## 🐳 Production Deployment

For production, it is recommended to use **Gunicorn** with **Uvicorn** workers:
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```
Make sure to enable **HTTPS** and set `ENABLE_HSTS=true` in your `.env`.
