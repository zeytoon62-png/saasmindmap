from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Crypto_wallets(Base):
    __tablename__ = "crypto_wallets"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    crypto_name = Column(String(100), nullable=False)
    wallet_address = Column(String(512), nullable=False)
    qr_code_url = Column(String(1024), nullable=True)
    is_active = Column(Boolean, nullable=True, default=True, server_default='true')
    display_order = Column(Integer, nullable=True, default=0, server_default='0')
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)