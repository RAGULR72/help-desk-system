from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Request
from typing import List
import os
import uuid
import shutil
from auth import get_current_user
from database import get_db
from sqlalchemy.orm import Session
from audit_logger import AuditLogger
import html

router = APIRouter(prefix="/api/upload", tags=["Upload"])

@router.post("/multi")
async def upload_multiple_files(
    request: Request,
    files: List[UploadFile] = File(...), 
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generic multi-file upload handler.
    Saves files to static/uploads/ and returns their public URLs.
    """
    # Security Configuration
    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.csv'}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

    # Create target directory if it doesn't exist
    upload_dir = "static/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    uploaded_files = []
    client_ip = request.client.host
    
    for file in files:
        try:
            # Check file extension
            file_extension = os.path.splitext(file.filename)[1].lower()
            if file_extension not in ALLOWED_EXTENSIONS:
                print(f"Rejected blocked file extension: {file_extension}")
                continue

            # Check file size (approximate from headers if possible, or after reading)
            # Re-reading file size from the UploadFile object
            file.file.seek(0, os.SEEK_END)
            file_size = file.file.tell()
            file.file.seek(0)
            
            if file_size > MAX_FILE_SIZE:
                print(f"Rejected oversized file: {file.filename} ({file_size} bytes)")
                continue

            # Generate a unique filename to prevent collisions and execution
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Construct the URL
            file_url = f"/static/uploads/{unique_filename}"
            
            # Audit Log
            AuditLogger.log_file_upload(db, current_user.id, file.filename, file_url, client_ip)
            
            uploaded_files.append({
                "url": file_url,
                "filename": html.escape(file.filename, quote=True),
                "content_type": file.content_type,
                "size": file_size
            })
        except Exception as e:
            # If one file fails, we might want to continue or log.
            print(f"Error uploading file {file.filename}: {e}")
            continue
            
    if not uploaded_files:
        raise HTTPException(status_code=400, detail="No files were successfully uploaded.")
        
    return uploaded_files
