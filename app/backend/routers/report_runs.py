import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.report_runs import Report_runsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/report_runs", tags=["report_runs"])


# ---------- Pydantic Schemas ----------
class Report_runsData(BaseModel):
    """Entity data schema (for create/update)"""
    run_type: str
    status: str = None
    detail: str = None


class Report_runsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    run_type: Optional[str] = None
    status: Optional[str] = None
    detail: Optional[str] = None


class Report_runsResponse(BaseModel):
    """Entity response schema"""
    id: int
    run_type: str
    status: Optional[str] = None
    detail: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Report_runsListResponse(BaseModel):
    """List response schema"""
    items: List[Report_runsResponse]
    total: int
    skip: int
    limit: int


class Report_runsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Report_runsData]


class Report_runsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Report_runsUpdateData


class Report_runsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Report_runsBatchUpdateItem]


class Report_runsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Report_runsListResponse)
async def query_report_runss(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query report_runss with filtering, sorting, and pagination"""
    logger.debug(f"Querying report_runss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Report_runsService(db)
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
        logger.debug(f"Found {result['total']} report_runss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid report_runs query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying report_runss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Report_runsListResponse)
async def query_report_runss_all(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query report_runss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying report_runss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Report_runsService(db)
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
        logger.debug(f"Found {result['total']} report_runss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid report_runs query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying report_runss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Report_runsResponse)
async def get_report_runs(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single report_runs by ID"""
    logger.debug(f"Fetching report_runs with id: {id}, fields={fields}")
    
    service = Report_runsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Report_runs with id {id} not found")
            raise HTTPException(status_code=404, detail="Report_runs not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report_runs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Report_runsResponse, status_code=201)
async def create_report_runs(
    data: Report_runsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new report_runs"""
    logger.debug(f"Creating new report_runs with data: {data}")
    
    service = Report_runsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create report_runs")
        
        logger.info(f"Report_runs created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating report_runs: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating report_runs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Report_runsResponse], status_code=201)
async def create_report_runss_batch(
    request: Report_runsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple report_runss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} report_runss")
    
    service = Report_runsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} report_runss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Report_runsResponse])
async def update_report_runss_batch(
    request: Report_runsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple report_runss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} report_runss")
    
    service = Report_runsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} report_runss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Report_runsResponse)
async def update_report_runs(
    id: int,
    data: Report_runsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing report_runs"""
    logger.debug(f"Updating report_runs {id} with data: {data}")

    service = Report_runsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Report_runs with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Report_runs not found")
        
        logger.info(f"Report_runs {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating report_runs {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating report_runs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_report_runss_batch(
    request: Report_runsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple report_runss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} report_runss")
    
    service = Report_runsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} report_runss successfully")
        return {"message": f"Successfully deleted {deleted_count} report_runss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_report_runs(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single report_runs by ID"""
    logger.debug(f"Deleting report_runs with id: {id}")
    
    service = Report_runsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Report_runs with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Report_runs not found")
        
        logger.info(f"Report_runs {id} deleted successfully")
        return {"message": "Report_runs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting report_runs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")