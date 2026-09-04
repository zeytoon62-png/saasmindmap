import logging
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.admin_auth import AdminAuthService, ensure_default_admin
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
    # First-run self-healing: seed a default admin if none exists yet, so the
    # /manager panel is always reachable (even when mock-data init is skipped).
    await ensure_default_admin(db)

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


def _format_duration(seconds: int) -> str:
    """Human-readable duration like 2h 5m / 3m 12s / 40s."""
    seconds = int(seconds or 0)
    if seconds <= 0:
        return "0s"
    hours, rem = divmod(seconds, 3600)
    minutes, secs = divmod(rem, 60)
    if hours:
        return f"{hours}h {minutes}m"
    if minutes:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


@router.get("/ip-report")
async def get_ip_report(db: AsyncSession = Depends(get_db)):
    """Aggregate visitor usage per IP address."""
    stmt = (
        select(
            Visitor_logs.ip_address,
            func.max(Visitor_logs.location).label("location"),
            func.min(Visitor_logs.created_at).label("first_seen"),
            func.max(Visitor_logs.created_at).label("last_seen"),
            func.coalesce(func.sum(Visitor_logs.duration_seconds), 0).label("total_duration"),
            func.count(Visitor_logs.id).label("visit_count"),
        )
        .group_by(Visitor_logs.ip_address)
        .order_by(func.max(Visitor_logs.created_at).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    items = [
        {
            "ip": r.ip_address,
            "location": r.location or "",
            "first_seen": str(r.first_seen) if r.first_seen else "",
            "last_seen": str(r.last_seen) if r.last_seen else "",
            "total_duration_seconds": int(r.total_duration or 0),
            "duration_human": _format_duration(int(r.total_duration or 0)),
            "visit_count": int(r.visit_count or 0),
        }
        for r in rows
    ]
    return {"items": items, "total": len(items)}


@router.get("/ip-report/export")
async def export_ip_report(db: AsyncSession = Depends(get_db)):
    """Export the per-IP usage report as an Excel (.xlsx) file."""
    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font
    from fastapi.responses import StreamingResponse

    stmt = (
        select(
            Visitor_logs.ip_address,
            func.max(Visitor_logs.location).label("location"),
            func.min(Visitor_logs.created_at).label("first_seen"),
            func.max(Visitor_logs.created_at).label("last_seen"),
            func.coalesce(func.sum(Visitor_logs.duration_seconds), 0).label("total_duration"),
            func.count(Visitor_logs.id).label("visit_count"),
        )
        .group_by(Visitor_logs.ip_address)
        .order_by(func.max(Visitor_logs.created_at).desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    wb = Workbook()
    ws = wb.active
    ws.title = "IP Usage"
    headers = [
        "IP Address",
        "Location",
        "First Seen",
        "Last Seen",
        "Duration",
        "Duration (seconds)",
        "Visits",
    ]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for r in rows:
        ws.append(
            [
                r.ip_address,
                r.location or "",
                str(r.first_seen) if r.first_seen else "",
                str(r.last_seen) if r.last_seen else "",
                _format_duration(int(r.total_duration or 0)),
                int(r.total_duration or 0),
                int(r.visit_count or 0),
            ]
        )

    # Roughly auto-size columns.
    for column in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in column)
        ws.column_dimensions[column[0].column_letter].width = min(max(max_len + 2, 10), 40)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=ip_usage_report.xlsx"},
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


# ========== Share Project ==========

class ShareProjectRequest(BaseModel):
    file_data: str
    expiry_months: int = 3
    password: Optional[str] = None


@router.post("/share")
async def create_share_link(
    data: ShareProjectRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a unique share link for a mind map project."""
    from services.shared_maps import SharedMapsService

    # Validate expiry: min 1 month, max 36 months (3 years)
    expiry_months = max(1, min(36, data.expiry_months))

    # Store the map JSON directly in the database (no external object storage).
    shared_service = SharedMapsService(db)
    shared = await shared_service.create_share(
        expiry_months=expiry_months,
        password=data.password,
        file_data=data.file_data,
    )

    share_url = f"/shared/{shared.token}"
    return {"success": True, "share_url": share_url, "token": shared.token}


@router.get("/shared/{token}")
async def get_shared_map(
    token: str,
    password: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Access a shared mind map by token"""
    from services.shared_maps import SharedMapsService

    shared_service = SharedMapsService(db)
    shared = await shared_service.get_by_token(token)

    if not shared:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    # Check expiry
    from datetime import timezone as tz
    now = datetime.now(tz.utc)
    expires = shared.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=tz.utc)
    if now > expires:
        raise HTTPException(status_code=410, detail="Share link expired")

    # Check if password is needed
    needs_password = bool(shared.password_hash)
    if needs_password and not password:
        return {"needs_password": True, "has_data": False}

    if needs_password:
        if SharedMapsService.hash_password(password) != shared.password_hash:
            raise HTTPException(status_code=403, detail="Invalid password")

    return {"needs_password": False, "has_data": True, "data": shared.file_data or ""}


@router.post("/share/cleanup")
async def cleanup_expired_shares(db: AsyncSession = Depends(get_db)):
    """Clean up expired shared maps"""
    from services.shared_maps import SharedMapsService
    shared_service = SharedMapsService(db)
    deleted = await shared_service.cleanup_expired()
    return {"success": True, "deleted_count": deleted}


# ========== Standalone Storage Proxy Endpoints ==========

class DownloadUrlRequest(BaseModel):
    bucket_name: str
    object_key: str


@router.post("/upload-file")
async def upload_file_standalone(
    file: UploadFile = File(...),
    bucket_name: str = Form("qr-images"),
    object_key: str = Form(""),
):
    """
    Standalone file upload endpoint.
    Saves the uploaded file to the local uploads directory and returns its key.
    """
    import os

    from services.local_storage import ensure_upload_dir, sanitize_key

    if not object_key:
        object_key = f"{bucket_name}/{file.filename}"

    safe_key = sanitize_key(object_key)
    if not safe_key:
        raise HTTPException(status_code=400, detail="Invalid object key")

    directory = ensure_upload_dir(bucket_name)
    dest_path = os.path.join(directory, safe_key)

    file_content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(file_content)

    return {"success": True, "object_key": object_key}


@router.post("/download-url")
async def get_download_url_standalone(data: DownloadUrlRequest):
    """
    Standalone download URL endpoint.
    Returns a local URL that serves the uploaded file.
    """
    from services.local_storage import sanitize_bucket, sanitize_key

    safe_bucket = sanitize_bucket(data.bucket_name)
    safe_key = sanitize_key(data.object_key)
    if not safe_key:
        raise HTTPException(status_code=400, detail="Invalid object key")

    return {"download_url": f"/api/v1/uploads/{safe_bucket}/{safe_key}"}