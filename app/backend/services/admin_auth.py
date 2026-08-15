import logging
import bcrypt
from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.admin_users import Admin_users

logger = logging.getLogger(__name__)


class AdminAuthService:
    """Service for admin authentication"""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode(), hashed.encode())
        except Exception:
            return False

    async def authenticate(self, username: str, password: str) -> Optional[Admin_users]:
        """Authenticate admin user"""
        stmt = select(Admin_users).where(
            Admin_users.username == username,
            Admin_users.is_active == True
        )
        result = await self.db.execute(stmt)
        admin = result.scalar_one_or_none()
        if admin and self.verify_password(password, admin.password_hash):
            return admin
        return None

    async def change_password(self, admin_id: int, new_password: str) -> bool:
        """Change admin password"""
        stmt = select(Admin_users).where(Admin_users.id == admin_id)
        result = await self.db.execute(stmt)
        admin = result.scalar_one_or_none()
        if admin:
            admin.password_hash = self.hash_password(new_password)
            await self.db.commit()
            return True
        return False

    async def change_username(self, admin_id: int, new_username: str) -> bool:
        """Change admin username"""
        stmt = select(Admin_users).where(Admin_users.id == admin_id)
        result = await self.db.execute(stmt)
        admin = result.scalar_one_or_none()
        if admin:
            admin.username = new_username
            await self.db.commit()
            return True
        return False

    async def create_admin(self, username: str, password: str, role: str = "admin") -> Optional[Admin_users]:
        """Create a new admin user"""
        hashed = self.hash_password(password)
        new_admin = Admin_users(
            username=username,
            password_hash=hashed,
            role=role,
            is_active=True,
        )
        self.db.add(new_admin)
        await self.db.commit()
        return new_admin

    async def list_admins(self):
        """List all admin users"""
        stmt = select(Admin_users).order_by(Admin_users.id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def delete_admin(self, admin_id: int) -> bool:
        """Delete an admin user"""
        stmt = select(Admin_users).where(Admin_users.id == admin_id)
        result = await self.db.execute(stmt)
        admin = result.scalar_one_or_none()
        if admin:
            await self.db.delete(admin)
            await self.db.commit()
            return True
        return False