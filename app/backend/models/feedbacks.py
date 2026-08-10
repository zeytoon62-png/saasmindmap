from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Feedbacks(Base):
    __tablename__ = "feedbacks"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    message = Column(String, nullable=False)
    contact_info = Column(String, nullable=True)
    device_info = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)