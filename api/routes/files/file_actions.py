"""
API routes for direct remote file operations (save, create, delete).
"""

import logging
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from services.workspace.file_editor_service import file_editor_service
from api.routes.files.files import _resolve_target_path

logger = logging.getLogger("api.routes.file_actions")
router = APIRouter(prefix="/api/v1/files", tags=["File Actions"])


class SaveFileRequest(BaseModel):
    path: str = Field(..., description="Absolute or repo-relative path of the file to save")
    content: str = Field(..., description="Full text content of the file")


class CreateItemRequest(BaseModel):
    path: str = Field(..., description="Path for the new file or directory")
    is_dir: bool = Field(False, description="Whether to create a directory")


class DeleteItemRequest(BaseModel):
    path: str = Field(..., description="Path of the file or directory to delete")


class RenameItemRequest(BaseModel):
    path: str = Field(..., description="Current path of the file or directory to rename")
    new_name: str = Field(..., min_length=1, max_length=255, description="New name without parent path")


class MoveItemRequest(BaseModel):
    source_path: str = Field(..., description="Path of file or directory to move")
    destination_folder: str = Field(..., description="Destination directory path")


@router.post("/save")
async def save_file(payload: SaveFileRequest):
    """Save updated content directly to a file on disk."""
    if not payload.path.strip():
        raise HTTPException(status_code=400, detail="Path cannot be empty")

    target = _resolve_target_path(payload.path.strip())
    try:
        res = file_editor_service.save_file_content(target, payload.content)
        return res
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error("Error saving file %s: %s", payload.path, e)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


@router.post("/create")
async def create_file_or_dir(payload: CreateItemRequest):
    """Create a new file or directory inside the workspace."""
    target = _resolve_target_path(payload.path.strip())
    try:
        res = file_editor_service.create_new_file_or_dir(target, payload.is_dir)
        return res
    except FileExistsError as fe:
        raise HTTPException(status_code=409, detail=str(fe))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Creation failed: {str(e)}")


@router.delete("/delete")
async def delete_file_or_dir(payload: DeleteItemRequest):
    """Delete a file or directory from the workspace."""
    target = _resolve_target_path(payload.path.strip())
    try:
        res = file_editor_service.delete_file_or_dir(target)
        return res
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")


@router.post("/rename")
async def rename_file_or_dir(payload: RenameItemRequest):
    """Rename a file or directory in place."""
    target = _resolve_target_path(payload.path.strip())
    try:
        res = file_editor_service.rename_item(target, payload.new_name.strip())
        return res
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except FileExistsError as fe:
        raise HTTPException(status_code=409, detail=str(fe))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rename failed: {str(e)}")


@router.post("/move")
async def move_file_or_dir(payload: MoveItemRequest):
    """Move a file or directory into a target directory."""
    src = _resolve_target_path(payload.source_path.strip())
    dst_folder = _resolve_target_path(payload.destination_folder.strip())
    try:
        res = file_editor_service.move_item(src, dst_folder)
        return res
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except FileExistsError as fe:
        raise HTTPException(status_code=409, detail=str(fe))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Move failed: {str(e)}")
