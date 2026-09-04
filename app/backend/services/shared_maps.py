import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from decimal import Decimal
from uuid import UUID as PythonUUID

from sqlalchemy import select, func, delete
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.types import Boolean, Date, DateTime, Float, Integer, Numeric

from models.shared_maps import Shared_maps

logger = logging.getLogger(__name__)


class SharedMapsService:
    """Service for shared mind map links"""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def hash_password(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    async def create_share(
        self,
        object_key: str = "",
        expiry_months: int = 3,
        password: Optional[str] = None,
        file_data: Optional[str] = None,
    ) -> Shared_maps:
        """Create a new shared map entry"""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=expiry_months * 30)
        password_hash = self.hash_password(password) if password else None

        obj = Shared_maps(
            token=token,
            object_key=object_key or "",
            file_data=file_data,
            password_hash=password_hash,
            expires_at=expires_at,
        )
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        logger.info(f"Created shared map with token: {token}")
        return obj

    async def get_by_token(self, token: str) -> Optional[Shared_maps]:
        """Get shared map by token"""
        result = await self.db.execute(
            select(Shared_maps).where(Shared_maps.token == token)
        )
        return result.scalar_one_or_none()

    async def verify_access(self, token: str, password: Optional[str] = None) -> Optional[Shared_maps]:
        """Verify access to a shared map (check expiry and password)"""
        shared = await self.get_by_token(token)
        if not shared:
            return None
        # Check expiry
        now = datetime.now(timezone.utc)
        expires = shared.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if now > expires:
            return None
        # Check password
        if shared.password_hash:
            if not password:
                return None
            if self.hash_password(password) != shared.password_hash:
                return None
        return shared

    async def cleanup_expired(self) -> int:
        """Delete expired shared maps"""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            delete(Shared_maps).where(Shared_maps.expires_at < now)
        )
        await self.db.commit()
        deleted = result.rowcount or 0
        if deleted > 0:
            logger.info(f"Cleaned up {deleted} expired shared maps")
        return deleted

    async def get_by_id(self, obj_id: int) -> Optional[Shared_maps]:
        """Get shared_maps by ID"""
        result = await self.db.execute(
            select(Shared_maps).where(Shared_maps.id == obj_id)
        )
        return result.scalar_one_or_none()

    async def delete(self, obj_id: int) -> bool:
        """Delete shared_maps"""
        obj = await self.get_by_id(obj_id)
        if not obj:
            return False
        await self.db.delete(obj)
        await self.db.commit()
        return True


# Alias for auto-generated router compatibility
Shared_mapsService = SharedMapsService