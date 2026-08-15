import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.crypto_wallets import Crypto_walletsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/crypto_wallets", tags=["crypto_wallets"])


# ---------- Pydantic Schemas ----------
class Crypto_walletsData(BaseModel):
    """Entity data schema (for create/update)"""
    crypto_name: str
    wallet_address: str
    qr_code_url: str = None
    is_active: bool = None
    display_order: int = None


class Crypto_walletsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    crypto_name: Optional[str] = None
    wallet_address: Optional[str] = None
    qr_code_url: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class Crypto_walletsResponse(BaseModel):
    """Entity response schema"""
    id: int
    crypto_name: str
    wallet_address: str
    qr_code_url: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Crypto_walletsListResponse(BaseModel):
    """List response schema"""
    items: List[Crypto_walletsResponse]
    total: int
    skip: int
    limit: int


class Crypto_walletsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Crypto_walletsData]


class Crypto_walletsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Crypto_walletsUpdateData


class Crypto_walletsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Crypto_walletsBatchUpdateItem]


class Crypto_walletsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Crypto_walletsListResponse)
async def query_crypto_walletss(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query crypto_walletss with filtering, sorting, and pagination"""
    logger.debug(f"Querying crypto_walletss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Crypto_walletsService(db)
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
        logger.debug(f"Found {result['total']} crypto_walletss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid crypto_wallets query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying crypto_walletss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Crypto_walletsListResponse)
async def query_crypto_walletss_all(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query crypto_walletss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying crypto_walletss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Crypto_walletsService(db)
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
        logger.debug(f"Found {result['total']} crypto_walletss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid crypto_wallets query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying crypto_walletss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Crypto_walletsResponse)
async def get_crypto_wallets(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single crypto_wallets by ID"""
    logger.debug(f"Fetching crypto_wallets with id: {id}, fields={fields}")
    
    service = Crypto_walletsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Crypto_wallets with id {id} not found")
            raise HTTPException(status_code=404, detail="Crypto_wallets not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching crypto_wallets {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Crypto_walletsResponse, status_code=201)
async def create_crypto_wallets(
    data: Crypto_walletsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new crypto_wallets"""
    logger.debug(f"Creating new crypto_wallets with data: {data}")
    
    service = Crypto_walletsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create crypto_wallets")
        
        logger.info(f"Crypto_wallets created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating crypto_wallets: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating crypto_wallets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Crypto_walletsResponse], status_code=201)
async def create_crypto_walletss_batch(
    request: Crypto_walletsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple crypto_walletss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} crypto_walletss")
    
    service = Crypto_walletsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} crypto_walletss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Crypto_walletsResponse])
async def update_crypto_walletss_batch(
    request: Crypto_walletsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple crypto_walletss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} crypto_walletss")
    
    service = Crypto_walletsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} crypto_walletss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Crypto_walletsResponse)
async def update_crypto_wallets(
    id: int,
    data: Crypto_walletsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing crypto_wallets"""
    logger.debug(f"Updating crypto_wallets {id} with data: {data}")

    service = Crypto_walletsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Crypto_wallets with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Crypto_wallets not found")
        
        logger.info(f"Crypto_wallets {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating crypto_wallets {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating crypto_wallets {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_crypto_walletss_batch(
    request: Crypto_walletsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple crypto_walletss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} crypto_walletss")
    
    service = Crypto_walletsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} crypto_walletss successfully")
        return {"message": f"Successfully deleted {deleted_count} crypto_walletss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_crypto_wallets(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single crypto_wallets by ID"""
    logger.debug(f"Deleting crypto_wallets with id: {id}")
    
    service = Crypto_walletsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Crypto_wallets with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Crypto_wallets not found")
        
        logger.info(f"Crypto_wallets {id} deleted successfully")
        return {"message": "Crypto_wallets deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting crypto_wallets {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")