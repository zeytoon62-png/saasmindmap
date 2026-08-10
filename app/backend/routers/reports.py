import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from core.database import get_db
from services.feedbacks import FeedbacksService
from services.visitor_logs import Visitor_logsService
from services.weekly_report import WeeklyReportService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


class FeedbackRequest(BaseModel):
    message: str
    contact_info: Optional[str] = None
    device_info: Optional[str] = None


class VisitorLogRequest(BaseModel):
    page_visited: Optional[str] = None
    actions_summary: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None


class SuccessResponse(BaseModel):
    success: bool
    message: str = ""


@router.post("/feedback", response_model=SuccessResponse)
async def submit_feedback(
    data: FeedbackRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Submit user feedback - no auth required"""
    try:
        # Get IP from request
        ip_address = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
        if "," in ip_address:
            ip_address = ip_address.split(",")[0].strip()

        service = FeedbacksService(db)
        await service.create({
            "message": data.message,
            "contact_info": data.contact_info or "",
            "device_info": data.device_info or "",
            "ip_address": ip_address,
        })
        return SuccessResponse(success=True, message="Feedback submitted successfully")
    except Exception as e:
        logger.error(f"Failed to submit feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")


@router.post("/visitor-log", response_model=SuccessResponse)
async def log_visitor(
    data: VisitorLogRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Log visitor information - no auth required"""
    try:
        ip_address = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
        if "," in ip_address:
            ip_address = ip_address.split(",")[0].strip()

        user_agent = request.headers.get("User-Agent", "")

        service = Visitor_logsService(db)
        await service.create({
            "ip_address": ip_address,
            "user_agent": user_agent,
            "device_type": data.device_type or "",
            "browser": data.browser or "",
            "os": data.os or "",
            "page_visited": data.page_visited or "/",
            "actions_summary": data.actions_summary or "",
        })
        return SuccessResponse(success=True, message="Visitor logged successfully")
    except Exception as e:
        logger.error(f"Failed to log visitor: {e}")
        raise HTTPException(status_code=500, detail="Failed to log visitor")


@router.post("/send-weekly-report", response_model=SuccessResponse)
async def send_weekly_report(
    db: AsyncSession = Depends(get_db),
):
    """Send weekly report email and clear data - called by scheduler"""
    try:
        service = WeeklyReportService(db)
        success = await service.send_weekly_report()
        if success:
            return SuccessResponse(success=True, message="Weekly report sent and data cleared")
        else:
            return SuccessResponse(success=False, message="Failed to send email, data preserved")
    except Exception as e:
        logger.error(f"Weekly report error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send weekly report: {str(e)}")