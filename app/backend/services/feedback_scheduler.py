"""Background scheduler that periodically emails batched normal feedback.

This runs inside the FastAPI lifespan (server mode only) and sends normal
feedback as a digest to the configured ``feedback_normal_email_*`` addresses
according to the ``feedback_schedule`` site setting.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from core.database import db_manager
from models.email_logs import Email_logs
from models.site_settings import Site_settings
from services.email_service import EmailService
from services.feedbacks import FeedbacksService

logger = logging.getLogger(__name__)

# How often the scheduler wakes up to check whether a batch is due.
CHECK_INTERVAL_SECONDS = 600  # 10 minutes

# feedback_schedule value -> seconds between normal-feedback batch sends.
SCHEDULE_SECONDS = {
    "hourly": 3600,
    "daily": 86400,
    "weekly": 604800,
}
DEFAULT_SCHEDULE = "weekly"


async def _get_setting(db, key: str, default: str = "") -> str:
    result = await db.execute(
        select(Site_settings.setting_value).where(Site_settings.setting_key == key)
    )
    value = result.scalar_one_or_none()
    return value if value is not None else default


async def _last_batch_sent_at(db):
    """Return the sent_at of the most recent successful normal batch, or None."""
    result = await db.execute(
        select(Email_logs.sent_at)
        .where(Email_logs.email_type == "normal_batch")
        .where(Email_logs.status == "sent")
        .order_by(Email_logs.sent_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _send_due_normal_batch() -> None:
    if db_manager.async_session_maker is None:
        return

    async with db_manager.async_session_maker() as db:
        schedule = (await _get_setting(db, "feedback_schedule", DEFAULT_SCHEDULE)).strip().lower()
        interval = SCHEDULE_SECONDS.get(schedule, SCHEDULE_SECONDS[DEFAULT_SCHEDULE])

        last_sent = await _last_batch_sent_at(db)
        now = datetime.now(timezone.utc)
        if last_sent is not None:
            last = last_sent if last_sent.tzinfo is not None else last_sent.replace(tzinfo=timezone.utc)
            if (now - last).total_seconds() < interval:
                return  # not due yet

        service = FeedbacksService(db)
        result = await service.get_list(
            skip=0,
            limit=200,
            query_dict={"feedback_type": "normal"},
            sort="-created_at",
        )
        items = result.get("items", [])
        if not items:
            return

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
        logger.info("Scheduled normal feedback batch send result: %s", sent)


async def run_feedback_scheduler() -> None:
    """Loop forever, checking the schedule, until the task is cancelled."""
    logger.info("Feedback email scheduler started")
    while True:
        try:
            await _send_due_normal_batch()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Feedback scheduler tick failed: {e}", exc_info=True)
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
