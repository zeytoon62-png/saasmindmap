from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Email_logs(Base):
    __tablename__ = "email_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    subject = Column(String(512), nullable=False)
    recipients = Column(String(1024), nullable=False)
    body_preview = Column(String(2048), nullable=False)
    email_type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default='sent', server_default='sent')
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)