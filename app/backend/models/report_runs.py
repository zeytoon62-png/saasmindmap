from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Report_runs(Base):
    __tablename__ = "report_runs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    run_type = Column(String, nullable=False)
    status = Column(String, nullable=True)
    detail = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)