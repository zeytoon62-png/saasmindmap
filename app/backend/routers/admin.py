import logging
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.admin_auth import AdminAuthService
from services.admin_users import Admin_usersService
from services.crypto_wallets import Crypto_walletsService
from services.site_settings import Site_settingsService
from services.visitor_logs import Visitor_logsService
from services.feedbacks import FeedbacksService
from services.email_service import EmailService
from services.email_logs import Email_logsService
from models.admin_users import Admin_users
from models.visitor_logs import Visitor_logs
from models.feedbacks import Feedbacks
from models.site_settings import Site_settings
from models.crypto_wallets import Crypto_wallets
from models.email_logs import Email_logs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ========== Schemas ==========

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    success: bool
    admin_id: Optional[int] = None
    username: Optional[str] = None
    role: Optional[str] = None
    message: str = ""


class ChangeCredentialsRequest(BaseModel):
    admin_id: int
    new_username: Optional[str] = None
    new_password: Optional[str] = None


class CreateAdminRequest(BaseModel):
    username: str
    password: str
    role: str = "admin"


class AdminUserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool


class UpdateSettingRequest(BaseModel):
    setting_key: str
    setting_value: str


class SettingResponse(BaseModel):
    id: int
    setting_key: str
    setting_value: str


class CryptoWalletRequest(BaseModel):
    crypto_name: str
    wallet_address: str
    qr_code_url: str = ""
    is_active: bool = True
    display_order: int = 0


class CryptoWalletResponse(BaseModel):
    id: int
    crypto_name: str
    wallet_address: str
    qr_code_url: str
    is_active: bool
    display_order: int


class DateRangeRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ReportResponse(BaseModel):
    total_visits: int
    visitor_ips: List[str]
    new_files_count: int
    mobile_count: int
    desktop_count: int


class SuccessResponse(BaseModel):
    success: bool
    message: str = ""


# ========== Auth ==========

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(
    data: AdminLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Admin login"""
    service = AdminAuthService(db)
    admin = await service.authenticate(data.username, data.password)
    if not admin:
        return AdminLoginResponse(success=False, message="Invalid credentials")
    return AdminLoginResponse(
        success=True,
        admin_id=admin.id,
        username=admin.username,
        role=admin.role,
        message="Login successful",
    )


@router.post("/change-credentials", response_model=SuccessResponse)
async def change_credentials(
    data: ChangeCredentialsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Change admin username/password"""
    service = AdminAuthService(db)
    if data.new_username:
        ok = await service.change_username(data.admin_id, data.new_username)
        if not ok:
            raise HTTPException(status_code=404, detail="Admin not found")
    if data.new_password:
        ok = await service.change_password(data.admin_id, data.new_password)
        if not ok:
            raise HTTPException(status_code=404, detail="Admin not found")
    return SuccessResponse(success=True, message="Credentials updated")


@router.post("/create-admin", response_model=AdminUserResponse)
async def create_admin(
    data: CreateAdminRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new admin user"""
    service = AdminAuthService(db)
    admin = await service.create_admin(data.username, data.password, data.role)
    if not admin:
        raise HTTPException(status_code=500, detail="Failed to create admin")
    return AdminUserResponse(
        id=admin.id,
        username=admin.username,
        role=admin.role,
        is_active=admin.is_active,
    )


@router.get("/list-admins", response_model=List[AdminUserResponse])
async def list_admins(db: AsyncSession = Depends(get_db)):
    """List all admin users"""
    service = AdminAuthService(db)
    admins = await service.list_admins()
    return [
        AdminUserResponse(id=a.id, username=a.username, role=a.role, is_active=a.is_active)
        for a in admins
    ]


@router.delete("/delete-admin/{admin_id}", response_model=SuccessResponse)
async def delete_admin(admin_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an admin user"""
    service = AdminAuthService(db)
    ok = await service.delete_admin(admin_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Admin not found")
    return SuccessResponse(success=True, message="Admin deleted")


# ========== Site Settings ==========

@router.get("/settings", response_model=List[SettingResponse])
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    """Get all site settings"""
    service = Site_settingsService(db)
    result = await service.get_list(skip=0, limit=100)
    items = result.get("items", [])
    return [
        SettingResponse(id=s.id, setting_key=s.setting_key, setting_value=s.setting_value)
        for s in items
    ]


@router.post("/settings", response_model=SuccessResponse)
async def update_setting(
    data: UpdateSettingRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update or create a site setting"""
    stmt = select(Site_settings).where(Site_settings.setting_key == data.setting_key)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        existing.setting_value = data.setting_value
    else:
        new_setting = Site_settings(setting_key=data.setting_key, setting_value=data.setting_value)
        db.add(new_setting)
    await db.commit()
    return SuccessResponse(success=True, message="Setting updated")


# ========== Crypto Wallets ==========

@router.get("/wallets", response_model=List[CryptoWalletResponse])
async def get_wallets(db: AsyncSession = Depends(get_db)):
    """Get all crypto wallets"""
    service = Crypto_walletsService(db)
    result = await service.get_list(skip=0, limit=100, sort="display_order")
    items = result.get("items", [])
    return [
        CryptoWalletResponse(
            id=w.id,
            crypto_name=w.crypto_name,
            wallet_address=w.wallet_address,
            qr_code_url=w.qr_code_url or "",
            is_active=w.is_active if w.is_active is not None else True,
            display_order=w.display_order or 0,
        )
        for w in items
    ]


@router.post("/wallets", response_model=CryptoWalletResponse)
async def create_wallet(
    data: CryptoWalletRequest,
    db: AsyncSession = Depends(get_db),
):
    """Add a new crypto wallet"""
    service = Crypto_walletsService(db)
    wallet = await service.create({
        "crypto_name": data.crypto_name,
        "wallet_address": data.wallet_address,
        "qr_code_url": data.qr_code_url,
        "is_active": data.is_active,
        "display_order": data.display_order,
    })
    return CryptoWalletResponse(
        id=wallet.id,
        crypto_name=wallet.crypto_name,
        wallet_address=wallet.wallet_address,
        qr_code_url=wallet.qr_code_url or "",
        is_active=wallet.is_active if wallet.is_active is not None else True,
        display_order=wallet.display_order or 0,
    )


@router.put("/wallets/{wallet_id}", response_model=SuccessResponse)
async def update_wallet(
    wallet_id: int,
    data: CryptoWalletRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update a crypto wallet"""
    service = Crypto_walletsService(db)
    wallet = await service.update(wallet_id, {
        "crypto_name": data.crypto_name,
        "wallet_address": data.wallet_address,
        "qr_code_url": data.qr_code_url,
        "is_active": data.is_active,
        "display_order": data.display_order,
    })
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return SuccessResponse(success=True, message="Wallet updated")


@router.delete("/wallets/{wallet_id}", response_model=SuccessResponse)
async def delete_wallet(wallet_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a crypto wallet"""
    service = Crypto_walletsService(db)
    ok = await service.delete(wallet_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return SuccessResponse(success=True, message="Wallet deleted")


# ========== Reports ==========

@router.post("/reports", response_model=ReportResponse)
async def get_reports(
    data: DateRangeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Get reporting dashboard data with optional date range filter"""
    conditions = []
    if data.start_date:
        try:
            start = datetime.fromisoformat(data.start_date)
            conditions.append(Visitor_logs.created_at >= start)
        except ValueError:
            pass
    if data.end_date:
        try:
            end = datetime.fromisoformat(data.end_date)
            conditions.append(Visitor_logs.created_at <= end)
        except ValueError:
            pass

    # Total visits
    visit_stmt = select(func.count(Visitor_logs.id))
    if conditions:
        visit_stmt = visit_stmt.where(and_(*conditions))
    visit_result = await db.execute(visit_stmt)
    total_visits = visit_result.scalar() or 0

    # Unique IPs
    ip_stmt = select(Visitor_logs.ip_address).distinct()
    if conditions:
        ip_stmt = ip_stmt.where(and_(*conditions))
    ip_result = await db.execute(ip_stmt)
    visitor_ips = [row[0] for row in ip_result.fetchall() if row[0]]

    # Mobile vs Desktop
    mobile_stmt = select(func.count(Visitor_logs.id)).where(Visitor_logs.device_type == "mobile")
    desktop_stmt = select(func.count(Visitor_logs.id)).where(Visitor_logs.device_type == "desktop")
    if conditions:
        mobile_stmt = mobile_stmt.where(and_(*conditions))
        desktop_stmt = desktop_stmt.where(and_(*conditions))
    mobile_result = await db.execute(mobile_stmt)
    desktop_result = await db.execute(desktop_stmt)
    mobile_count = mobile_result.scalar() or 0
    desktop_count = desktop_result.scalar() or 0

    # New files (feedback entries as proxy for "generated files")
    fb_conditions = []
    if data.start_date:
        try:
            start = datetime.fromisoformat(data.start_date)
            fb_conditions.append(Feedbacks.created_at >= start)
        except ValueError:
            pass
    if data.end_date:
        try:
            end = datetime.fromisoformat(data.end_date)
            fb_conditions.append(Feedbacks.created_at <= end)
        except ValueError:
            pass
    file_stmt = select(func.count(Feedbacks.id))
    if fb_conditions:
        file_stmt = file_stmt.where(and_(*fb_conditions))
    file_result = await db.execute(file_stmt)
    new_files_count = file_result.scalar() or 0

    return ReportResponse(
        total_visits=total_visits,
        visitor_ips=visitor_ips,
        new_files_count=new_files_count,
        mobile_count=mobile_count,
        desktop_count=desktop_count,
    )


# ========== Feedback Management ==========

@router.get("/feedbacks")
async def get_feedbacks(
    feedback_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get feedback list filtered by type"""
    service = FeedbacksService(db)
    query_dict = {}
    if feedback_type:
        query_dict["feedback_type"] = feedback_type
    result = await service.get_list(skip=skip, limit=limit, query_dict=query_dict, sort="-created_at")
    items = result.get("items", [])
    return {
        "items": [
            {
                "id": f.id,
                "message": f.message,
                "feedback_type": f.feedback_type or "normal",
                "contact_info": f.contact_info or "",
                "device_info": f.device_info or "",
                "ip_address": f.ip_address or "",
                "created_at": str(f.created_at) if f.created_at else "",
            }
            for f in items
        ],
        "total": result.get("total", 0),
    }


# ========== Email Logs ==========

@router.get("/email-logs")
async def get_email_logs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get email sending logs"""
    service = Email_logsService(db)
    result = await service.get_list(skip=skip, limit=limit, sort="-sent_at")
    items = result.get("items", [])
    return {
        "items": [
            {
                "id": log.id,
                "subject": log.subject or "",
                "recipients": log.recipients or "",
                "body_preview": (log.body_preview or "")[:200],
                "email_type": log.email_type or "",
                "status": log.status or "",
                "sent_at": str(log.sent_at) if log.sent_at else "",
            }
            for log in items
        ],
        "total": result.get("total", 0),
    }


# ========== Send Normal Feedback Batch ==========

@router.post("/send-feedback-batch")
async def send_feedback_batch(db: AsyncSession = Depends(get_db)):
    """Manually trigger sending batched normal feedbacks"""
    service = FeedbacksService(db)
    result = await service.get_list(
        skip=0, limit=200,
        query_dict={"feedback_type": "normal"},
        sort="-created_at",
    )
    items = result.get("items", [])
    if not items:
        return {"success": False, "message": "No normal feedbacks to send"}

    feedbacks_data = [
        {
            "message": f.message or "",
            "contact_info": f.contact_info or "",
            "created_at": str(f.created_at) if f.created_at else "",
        }
        for f in items
    ]

    email_service = EmailService(db)
    sent = await email_service.send_normal_feedback_batch(feedbacks_data)
    return {"success": sent, "message": f"Batch sent with {len(feedbacks_data)} items" if sent else "Failed to send"}


# ========== QR Image Upload for Wallets ==========

@router.post("/wallets/{wallet_id}/upload-qr")
async def upload_wallet_qr(
    wallet_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a QR code image for a wallet and store the object_key"""
    import httpx
    from services.storage import StorageService
    from schemas.storage import FileUpDownRequest

    # Verify wallet exists
    service = Crypto_walletsService(db)
    wallet = await service.get_by_id(wallet_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    # Read file content
    file_content = await file.read()
    object_key = f"wallet-qr/{wallet_id}/{file.filename}"

    # Get presigned upload URL
    storage = StorageService()
    upload_req = FileUpDownRequest(bucket_name="qr-images", object_key=object_key)
    upload_resp = await storage.create_upload_url(upload_req)

    if not upload_resp or not upload_resp.upload_url:
        raise HTTPException(status_code=500, detail="Failed to get upload URL")

    # Upload via presigned URL
    async with httpx.AsyncClient(timeout=30) as http_client:
        resp = await http_client.put(
            upload_resp.upload_url,
            content=file_content,
            headers={"Content-Type": file.content_type or "image/png"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=500, detail="Upload failed")

    # Update wallet qr_code_url with the object_key (not the presigned URL)
    await service.update(wallet_id, {"qr_code_url": object_key})
    await db.commit()

    return {"success": True, "object_key": object_key}