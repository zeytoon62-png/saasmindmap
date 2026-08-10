import logging
import os
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from models.feedbacks import Feedbacks
from models.visitor_logs import Visitor_logs

logger = logging.getLogger(__name__)

REPORT_EMAIL = "ebkhmobile@gmail.com"


class WeeklyReportService:
    """Service for sending weekly reports and clearing data"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_feedbacks(self) -> List[Dict[str, Any]]:
        """Get all feedbacks from database"""
        result = await self.db.execute(select(Feedbacks))
        feedbacks = result.scalars().all()
        return [
            {
                "id": f.id,
                "message": f.message,
                "contact_info": f.contact_info,
                "device_info": f.device_info,
                "ip_address": f.ip_address,
                "created_at": str(f.created_at) if f.created_at else None,
            }
            for f in feedbacks
        ]

    async def get_all_visitor_logs(self) -> List[Dict[str, Any]]:
        """Get all visitor logs from database"""
        result = await self.db.execute(select(Visitor_logs))
        logs = result.scalars().all()
        return [
            {
                "id": l.id,
                "ip_address": l.ip_address,
                "user_agent": l.user_agent,
                "device_type": l.device_type,
                "browser": l.browser,
                "os": l.os,
                "page_visited": l.page_visited,
                "actions_summary": l.actions_summary,
                "created_at": str(l.created_at) if l.created_at else None,
            }
            for l in logs
        ]

    async def clear_feedbacks(self):
        """Clear all feedbacks"""
        await self.db.execute(delete(Feedbacks))
        await self.db.commit()

    async def clear_visitor_logs(self):
        """Clear all visitor logs"""
        await self.db.execute(delete(Visitor_logs))
        await self.db.commit()

    @staticmethod
    def send_email(subject: str, body: str):
        """Send email via SMTP"""
        smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_username = os.environ.get("SMTP_USERNAME", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        smtp_from = os.environ.get("SMTP_FROM_EMAIL", smtp_username)

        if not smtp_username or not smtp_password:
            logger.error("SMTP credentials not configured")
            return False

        msg = MIMEMultipart()
        msg["From"] = smtp_from
        msg["To"] = REPORT_EMAIL
        msg["Subject"] = subject

        msg.attach(MIMEText(body, "html", "utf-8"))

        try:
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_from, REPORT_EMAIL, msg.as_string())
            server.quit()
            logger.info(f"Weekly report email sent to {REPORT_EMAIL}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    async def send_weekly_report(self) -> bool:
        """Compile and send weekly report, then clear data"""
        feedbacks = await self.get_all_feedbacks()
        visitor_logs = await self.get_all_visitor_logs()

        if not feedbacks and not visitor_logs:
            logger.info("No data to report this week")
            return True

        now = datetime.now().strftime("%Y-%m-%d %H:%M")

        # Build HTML report
        html = f"""
        <html dir="rtl">
        <head><meta charset="utf-8"></head>
        <body style="font-family: Tahoma, Arial, sans-serif; direction: rtl;">
        <h2>گزارش هفتگی نقشه ذهنی - {now}</h2>
        
        <h3>بازخوردها ({len(feedbacks)} مورد)</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr><th>شناسه</th><th>پیام</th><th>راه ارتباطی</th><th>دستگاه</th><th>IP</th><th>تاریخ</th></tr>
        """
        for f in feedbacks:
            html += f"""<tr>
                <td>{f['id']}</td>
                <td>{f['message'] or ''}</td>
                <td>{f['contact_info'] or ''}</td>
                <td>{f['device_info'] or ''}</td>
                <td>{f['ip_address'] or ''}</td>
                <td>{f['created_at'] or ''}</td>
            </tr>"""

        html += f"""</table>
        
        <h3>لاگ بازدیدکنندگان ({len(visitor_logs)} مورد)</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr><th>شناسه</th><th>IP</th><th>دستگاه</th><th>مرورگر</th><th>سیستم‌عامل</th><th>صفحه</th><th>اقدامات</th><th>تاریخ</th></tr>
        """
        for l in visitor_logs:
            html += f"""<tr>
                <td>{l['id']}</td>
                <td>{l['ip_address'] or ''}</td>
                <td>{l['device_type'] or ''}</td>
                <td>{l['browser'] or ''}</td>
                <td>{l['os'] or ''}</td>
                <td>{l['page_visited'] or ''}</td>
                <td>{l['actions_summary'] or ''}</td>
                <td>{l['created_at'] or ''}</td>
            </tr>"""

        html += """</table>
        </body></html>"""

        subject = f"Mind Map Editor - Weekly Report - {now}"
        success = self.send_email(subject, html)

        if success:
            await self.clear_feedbacks()
            await self.clear_visitor_logs()

        return success