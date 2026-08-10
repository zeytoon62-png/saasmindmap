import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.visitor_logs import Visitor_logsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/visitor_logs", tags=["visitor_logs"])


# ---------- Pydantic Schemas ----------
class Visitor_logsData(BaseModel):
    """Entity data schema (for create/update)"""
    ip_address: str
    user_agent: str = None
    device_type: str = None
    browser: str = None
    os: str = None
    page_visited: str = None
    actions_summary: str = None


class Visitor_logsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    page_visited: Optional[str] = None
    actions_summary: Optional[str] = None


class Visitor_logsResponse(BaseModel):
    """Entity response schema"""
    id: int
    ip_address: str
    user_agent: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    page_visited: Optional[str] = None
    actions_summary: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Visitor_logsListResponse(BaseModel):
    """List response schema"""
    items: List[Visitor_logsResponse]
    total: int
    skip: int
    limit: int


class Visitor_logsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Visitor_logsData]


class Visitor_logsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Visitor_logsUpdateData


class Visitor_logsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Visitor_logsBatchUpdateItem]


class Visitor_logsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Visitor_logsListResponse)
async def query_visitor_logss(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query visitor_logss with filtering, sorting, and pagination"""
    logger.debug(f"Querying visitor_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Visitor_logsService(db)
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
        logger.debug(f"Found {result['total']} visitor_logss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid visitor_logs query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying visitor_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Visitor_logsListResponse)
async def query_visitor_logss_all(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query visitor_logss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying visitor_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Visitor_logsService(db)
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
        logger.debug(f"Found {result['total']} visitor_logss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid visitor_logs query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying visitor_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Visitor_logsResponse)
async def get_visitor_logs(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single visitor_logs by ID"""
    logger.debug(f"Fetching visitor_logs with id: {id}, fields={fields}")
    
    service = Visitor_logsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Visitor_logs with id {id} not found")
            raise HTTPException(status_code=404, detail="Visitor_logs not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching visitor_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Visitor_logsResponse, status_code=201)
async def create_visitor_logs(
    data: Visitor_logsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new visitor_logs"""
    logger.debug(f"Creating new visitor_logs with data: {data}")
    
    service = Visitor_logsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create visitor_logs")
        
        logger.info(f"Visitor_logs created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating visitor_logs: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating visitor_logs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Visitor_logsResponse], status_code=201)
async def create_visitor_logss_batch(
    request: Visitor_logsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple visitor_logss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} visitor_logss")
    
    service = Visitor_logsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} visitor_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Visitor_logsResponse])
async def update_visitor_logss_batch(
    request: Visitor_logsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple visitor_logss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} visitor_logss")
    
    service = Visitor_logsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} visitor_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Visitor_logsResponse)
async def update_visitor_logs(
    id: int,
    data: Visitor_logsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing visitor_logs"""
    logger.debug(f"Updating visitor_logs {id} with data: {data}")

    service = Visitor_logsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Visitor_logs with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Visitor_logs not found")
        
        logger.info(f"Visitor_logs {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating visitor_logs {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating visitor_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_visitor_logss_batch(
    request: Visitor_logsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple visitor_logss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} visitor_logss")
    
    service = Visitor_logsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} visitor_logss successfully")
        return {"message": f"Successfully deleted {deleted_count} visitor_logss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_visitor_logs(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single visitor_logs by ID"""
    logger.debug(f"Deleting visitor_logs with id: {id}")
    
    service = Visitor_logsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Visitor_logs with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Visitor_logs not found")
        
        logger.info(f"Visitor_logs {id} deleted successfully")
        return {"message": "Visitor_logs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting visitor_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")