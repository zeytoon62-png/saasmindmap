import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.admin_users import Admin_usersService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/admin_users", tags=["admin_users"])


# ---------- Pydantic Schemas ----------
class Admin_usersData(BaseModel):
    """Entity data schema (for create/update)"""
    username: str
    password_hash: str
    role: str = None
    is_active: bool = None


class Admin_usersUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    username: Optional[str] = None
    password_hash: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class Admin_usersResponse(BaseModel):
    """Entity response schema"""
    id: int
    username: str
    password_hash: str
    role: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Admin_usersListResponse(BaseModel):
    """List response schema"""
    items: List[Admin_usersResponse]
    total: int
    skip: int
    limit: int


class Admin_usersBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Admin_usersData]


class Admin_usersBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Admin_usersUpdateData


class Admin_usersBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Admin_usersBatchUpdateItem]


class Admin_usersBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Admin_usersListResponse)
async def query_admin_userss(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query admin_userss with filtering, sorting, and pagination"""
    logger.debug(f"Querying admin_userss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Admin_usersService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} admin_userss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid admin_users query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying admin_userss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Admin_usersListResponse)
async def query_admin_userss_all(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query admin_userss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying admin_userss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Admin_usersService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} admin_userss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid admin_users query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying admin_userss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Admin_usersResponse)
async def get_admin_users(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single admin_users by ID"""
    logger.debug(f"Fetching admin_users with id: {id}, fields={fields}")
    
    service = Admin_usersService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Admin_users with id {id} not found")
            raise HTTPException(status_code=404, detail="Admin_users not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin_users {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Admin_usersResponse, status_code=201)
async def create_admin_users(
    data: Admin_usersData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin_users"""
    logger.debug(f"Creating new admin_users with data: {data}")
    
    service = Admin_usersService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create admin_users")
        
        logger.info(f"Admin_users created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating admin_users: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating admin_users: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Admin_usersResponse], status_code=201)
async def create_admin_userss_batch(
    request: Admin_usersBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple admin_userss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} admin_userss")
    
    service = Admin_usersService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} admin_userss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Admin_usersResponse])
async def update_admin_userss_batch(
    request: Admin_usersBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple admin_userss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} admin_userss")
    
    service = Admin_usersService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} admin_userss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Admin_usersResponse)
async def update_admin_users(
    id: int,
    data: Admin_usersUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing admin_users"""
    logger.debug(f"Updating admin_users {id} with data: {data}")

    service = Admin_usersService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Admin_users with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Admin_users not found")
        
        logger.info(f"Admin_users {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating admin_users {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating admin_users {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_admin_userss_batch(
    request: Admin_usersBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple admin_userss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} admin_userss")
    
    service = Admin_usersService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} admin_userss successfully")
        return {"message": f"Successfully deleted {deleted_count} admin_userss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_admin_users(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single admin_users by ID"""
    logger.debug(f"Deleting admin_users with id: {id}")
    
    service = Admin_usersService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Admin_users with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Admin_users not found")
        
        logger.info(f"Admin_users {id} deleted successfully")
        return {"message": "Admin_users deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting admin_users {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")