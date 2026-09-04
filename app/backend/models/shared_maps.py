from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text


class Shared_maps(Base):
    __tablename__ = "shared_maps"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    token = Column(String(64), nullable=False)
    object_key = Column(String(512), nullable=True)
    file_data = Column(Text, nullable=True)
    password_hash = Column(String(256), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)