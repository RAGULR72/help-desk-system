# Backend Rollback Plan

## 1. Description of Change
Updated dependencies to address security vulnerabilities (CVE-2026-0994, CVE-2025-4565, CVE-2024-47874).

- **fastapi**: 0.129.0 -> 0.128.8
- **starlette**: Added >=0.47.2
- **protobuf**: >=4.25.0 -> >=6.33.5

## 2. Trigger Conditions
Rollback should be initiated if:
- API endpoints return 500 errors consistently.
- Database connectivity issues persist (health check fails).
- AI/Protobuf integration creates RecursionError or SegFault.
- Performance degrades significantly (CPU/Memory spike).

## 3. Rollback Steps
If issues arise, execute the following commands to revert to the previous state:

1. **Stop the running application**:
   - `Ctrl+C` in the running terminal.

2. **Uninstall updated packages**:
   ```powershell
   venv\Scripts\pip uninstall -y fastapi starlette protobuf
   ```

3. **Reinstall previous versions**:
   Using the captured `current_versions.txt` (if available):
   ```powershell
   venv\Scripts\pip install -r current_versions.txt
   ```
   
   Or manually:
   ```powershell
   venv\Scripts\pip install fastapi==0.129.0 protobuf==4.25.0
   ```
   (Note: remove explicit starlette pin if causing issues, or pin to compatible version)

4. **Verify Rollback**:
   - Run `venv\Scripts\pip check` to ensure no conflicts.
   - Restart application: `start_backend.bat`
   - Check health: `http://localhost:8000/api/health/status`

## 4. Verification
After rollback, verify that:
- `/api/health/status` returns `{"status": "ok", ...}`
- Login works normally.
- Error logs are clear.
