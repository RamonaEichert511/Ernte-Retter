"""Sending email through Amazon SES (SMTP interface).

Settings come from environment variables, so no password is in the code:

    SMTP_HOST      e.g. email-smtp.eu-central-1.amazonaws.com (depends on region)
    SMTP_PORT      587
    SMTP_USER      SES SMTP username (created in the SES console)
    SMTP_PASSWORD  SES SMTP password (not the normal AWS secret key)
    MAIL_FROM      a sender address or domain verified in SES
    FRONTEND_URL   e.g. https://ernte-retter.example (used in links)

Without SMTP_HOST (local development) emails are only written to the log.
"""

import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM", SMTP_USER)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")


def send_email(to: str, subject: str, body: str) -> None:
    """Send one plain-text email. Never raises, so a mail problem cannot
    break the request that triggered it."""
    if not SMTP_HOST:
        logger.warning(
            "Email not sent (SMTP not configured): %s -> %s\n%s",
            subject,
            to,
            body,
        )
        return
    msg = EmailMessage()
    msg["From"] = MAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
    except Exception:
        logger.exception("Email to %s failed", to)


# ---------- mail texts (subject, body) ----------


def mail_verifizierung(name: str, link: str) -> tuple[str, str]:
    return (
        "Bitte bestätige deine E-Mail-Adresse",
        f"Hallo {name},\n\n"
        "willkommen bei Ernte-Retter! Bitte bestätige deine E-Mail-Adresse "
        "über diesen Link (24 Stunden gültig):\n\n"
        f"{link}\n\n"
        "Wenn du dich nicht registriert hast, kannst du diese E-Mail "
        "ignorieren.\n",
    )


def mail_reserviert(owner_name: str, titel: str) -> tuple[str, str]:
    return (
        f'Dein Inserat "{titel}" wurde reserviert',
        f"Hallo {owner_name},\n\n"
        f'jemand hat dein Inserat "{titel}" reserviert. '
        f"Schau bei Ernte-Retter vorbei: {FRONTEND_URL}\n",
    )


def mail_kontakt(titel: str) -> tuple[str, str]:
    return (
        f'Neue Nachricht zu "{titel}"',
        f'Du hast eine neue Nachricht zum Inserat "{titel}" erhalten. '
        f"Lies sie hier: {FRONTEND_URL}\n",
    )