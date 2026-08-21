import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.site_settings import Site_settings
from models.email_logs import Email_logs

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP with logging."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_setting(self, key: str) -> Optional[str]:
        stmt = select(Site_settings).where(Site_settings.setting_key == key)
        result = await self.db.execute(stmt)
        row = result.scalar_one_or_none()
        return row.setting_value if row else None

    async def get_smtp_config(self) -> dict:
        return {
            "host": await self._get_setting("smtp_host") or "",
            "port": int(await self._get_setting("smtp_port") or "587"),
            "username": await self._get_setting("smtp_username") or "",
            "password": await self._get_setting("smtp_password") or "",
            "from_email": await self._get_setting("smtp_from_email") or "",
        }

    async def send_email(
        self,
        recipients: List[str],
        subject: str,
        body: str,
        email_type: str = "normal_batch",
    ) -> bool:
        """Send an email and log it."""
        config = await self.get_smtp_config()

        if not config["host"] or not config["username"]:
            logger.warning("SMTP not configured, skipping email send")
            return False

        # Filter empty recipients
        recipients = [r.strip() for r in recipients if r.strip()]
        if not recipients:
            logger.warning("No recipients provided")
            return False

        status = "sent"
        try:
            msg = MIMEMultipart()
            msg["From"] = config["from_email"] or config["username"]
            msg["To"] = ", ".join(recipients)
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "html", "utf-8"))

            # Port 465 uses implicit TLS (SMTPS); other ports use STARTTLS.
            if config["port"] == 465:
                server = smtplib.SMTP_SSL(config["host"], config["port"], timeout=15)
            else:
                server = smtplib.SMTP(config["host"], config["port"], timeout=15)
            with server:
                if config["port"] != 465:
                    server.starttls()
                server.login(config["username"], config["password"])
                server.sendmail(msg["From"], recipients, msg.as_string())

            logger.info(f"Email sent to {recipients} - subject: {subject}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            status = "failed"

        # Log the email
        log_entry = Email_logs(
            subject=subject,
            recipients=", ".join(recipients),
            body_preview=body[:2000] if body else "",
            email_type=email_type,
            status=status,
            sent_at=datetime.utcnow(),
        )
        self.db.add(log_entry)
        await self.db.commit()

        return status == "sent"

    async def send_urgent_feedback(self, message: str, contact_info: str, device_info: str) -> bool:
        """Send urgent feedback immediately to configured urgent emails."""
        email1 = await self._get_setting("feedback_urgent_email_1") or ""
        email2 = await self._get_setting("feedback_urgent_email_2") or ""
        recipients = [e for e in [email1, email2] if e.strip()]

        if not recipients:
            logger.warning("No urgent feedback email recipients configured")
            return False

        subject = "🚨 URGENT Feedback - PMindMap"
        body = f"""
        <h2>Urgent Feedback Received</h2>
        <p><strong>Message:</strong></p>
        <p>{message}</p>
        <p><strong>Contact:</strong> {contact_info or 'N/A'}</p>
        <p><strong>Device:</strong> {device_info or 'N/A'}</p>
        <p><strong>Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        """

        return await self.send_email(recipients, subject, body, email_type="urgent_immediate")

    async def send_normal_feedback_batch(self, feedbacks: list) -> bool:
        """Send batched normal feedbacks to configured normal emails."""
        email1 = await self._get_setting("feedback_normal_email_1") or ""
        email2 = await self._get_setting("feedback_normal_email_2") or ""
        recipients = [e for e in [email1, email2] if e.strip()]

        if not recipients:
            logger.warning("No normal feedback email recipients configured")
            return False

        if not feedbacks:
            return False

        subject = f"📋 Feedback Summary - PMindMap ({len(feedbacks)} items)"
        rows = ""
        for fb in feedbacks:
            rows += f"""
            <tr>
                <td style="border:1px solid #ddd;padding:8px;">{fb.get('message','')}</td>
                <td style="border:1px solid #ddd;padding:8px;">{fb.get('contact_info','N/A')}</td>
                <td style="border:1px solid #ddd;padding:8px;">{fb.get('created_at','')}</td>
            </tr>
            """

        body = f"""
        <h2>Normal Feedback Summary ({len(feedbacks)} items)</h2>
        <table style="border-collapse:collapse;width:100%;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="border:1px solid #ddd;padding:8px;">Message</th>
                    <th style="border:1px solid #ddd;padding:8px;">Contact</th>
                    <th style="border:1px solid #ddd;padding:8px;">Date</th>
                </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
        <p><strong>Sent at:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        """

        return await self.send_email(recipients, subject, body, email_type="normal_batch")