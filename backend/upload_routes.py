from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
import os
import uuid
import shutil
from auth import get_current_user

router = APIRouter(prefix="/api/upload", tags=["Upload"])

@router.post("/multi")
async def upload_multiple_files(
    files: List[UploadFile] = File(...), 
    current_user = Depends(get_current_user)
):
    """
    Generic multi-file upload handler.
    Saves files to static/uploads/ and returns their public URLs.
    """
    # Create target directory if it doesn't exist
    upload_dir = "static/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    uploaded_files = []
    
    for file in files:
        try:
            # Generate a unique filename to prevent collisions
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Construct the URL
            file_url = f"/static/uploads/{unique_filename}"
            
            uploaded_files.append({
                "url": file_url,
                "filename": file.filename,
                "content_type": file.content_type,
                "size": os.path.getsize(file_path)
            })
        except Exception as e:
            # If one file fails, we might want to continue or log.
            print(f"Error uploading file {file.filename}: {e}")
            continue
            
    if not uploaded_files:
        raise HTTPException(status_code=400, detail="No files were successfully uploaded.")
        
    return uploaded_files
