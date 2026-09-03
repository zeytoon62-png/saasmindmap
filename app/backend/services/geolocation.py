"""Best-effort IP geolocation with an in-memory cache.

Used by the admin IP usage report to show an approximate location for each
visitor. Lookups are best-effort: any failure returns an empty string so the
report and visitor logging never break because of this.
"""

import logging
from typing import Dict

import httpx

logger = logging.getLogger(__name__)

_cache: Dict[str, str] = {}

_PRIVATE_PREFIXES = (
    "127.",
    "10.",
    "192.168.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
    "0.",
    "169.254.",
    "::1",
    "localhost",
    "unknown",
)


def _is_private_ip(ip: str) -> bool:
    if not ip:
        return True
    return ip.startswith(_PRIVATE_PREFIXES)


async def lookup_ip_location(ip: str) -> str:
    """Return a human-readable "City, Region, Country" for an IP, or ""."""
    ip = (ip or "").strip()
    if not ip or _is_private_ip(ip):
        return ""
    if ip in _cache:
        return _cache[ip]

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,country,regionName,city"},
            )
        if resp.status_code != 200:
            _cache[ip] = ""
            return ""
        data = resp.json()
        if data.get("status") != "success":
            _cache[ip] = ""
            return ""
        parts = [p for p in (data.get("city"), data.get("regionName"), data.get("country")) if p]
        location = ", ".join(parts)
        _cache[ip] = location
        return location
    except Exception as e:  # pragma: no cover - best-effort only
        logger.warning(f"IP geolocation failed for {ip}: {e}")
        _cache[ip] = ""
        return ""
