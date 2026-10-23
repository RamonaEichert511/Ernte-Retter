"""Sending email through the Amazon SES API (boto3).

Settings from environment variables (the server's .env):

    AWS_REGION    e.g. eu-central-1 (required to actually send)
    FRONTEND_URL  public address of the site, used in links
    MAIL_FROM     optional, overrides the sender address
                  (default: noreply@ernteretter.de, shown as "Ernte-Retter")

AWS credentials are NOT set here. On the server, boto3 picks them up from
the AWS permissions of the machine (IAM role), so no keys are in the code.

Without AWS_REGION (local development) emails are only written to the log.
"""

import logging
import os
from email.utils import formataddr, parseaddr

logger = logging.getLogger(__name__)

# Sender: the name is fixed here, the address defaults to the project's
# SES address. MAIL_FROM can override the address (a "Name <address>" value
# also works, only the address part is used).
MAIL_FROM_NAME = "Ernte-Retter"
_, _adresse = parseaddr(os.getenv("MAIL_FROM", "noreply@ernteretter.de"))
SENDER = formataddr((MAIL_FROM_NAME, _adresse))

# Emails are only sent when AWS_REGION is set (as on the server).
# Without it (local development) they are just written to the log.
AWS_REGION = os.getenv("AWS_REGION")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
# route of the marketplace page in the frontend (check it in App.jsx)
MARKTPLATZ_PATH = "/marktplatz"

_client = None


def _ses_client():
    # imported here so local development works without boto3 installed
    global _client
    if _client is None:
        import boto3

        _client = boto3.client("ses", region_name=AWS_REGION)
    return _client


def send_email(to: str, subject: str, body: str) -> None:
    """Send one plain-text email. Never raises, so a mail problem cannot
    break the request that triggered it."""
    if not AWS_REGION:
        logger.warning(
            "Email not sent (AWS_REGION not set): %s -> %s\n%s",
            subject,
            to,
            body,
        )
        return
    try:
        _ses_client().send_email(
            Source=SENDER,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Text": {"Data": body, "Charset": "UTF-8"}},
            },
        )
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
        "ignorieren.\n"
        "Für Rückfragen kontaktiere uns unter: info@ernteretter.de",
    )


def offer_link(offer_id: int) -> str:
    """Link to one offer on the site. The path has to match a route that
    exists in the frontend; change MARKTPLATZ_PATH if it is named differently."""
    return f"{FRONTEND_URL}{MARKTPLATZ_PATH}?offer={offer_id}"


def mail_reserviert(owner_name: str, titel: str, link: str) -> tuple[str, str]:
    return (
        f'Dein Inserat "{titel}" wurde reserviert',
        f"Hallo {owner_name},\n\n"
        f'jemand hat dein Inserat "{titel}" reserviert. '
        f"Hier geht es zum Inserat:\n\n{link}\n"
        "Für Rückfragen kontaktiere uns unter: info@ernteretter.de",
    )


def mail_kontakt(titel: str, link: str) -> tuple[str, str]:
    return (
        f'Neue Nachricht zu "{titel}"',
        f'Du hast eine neue Nachricht zum Inserat "{titel}" erhalten. '
        f"Lies sie hier:\n\n{link}\n"
        "Für Rückfragen kontaktiere uns unter: info@ernteretter.de",
    )