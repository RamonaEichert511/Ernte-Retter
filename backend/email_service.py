"""Sending email through the Amazon SES API (boto3).

Settings come from environment variables (the server's .env):

    MAIL_FROM     sender address verified in SES, e.g. noreply@ernteretter.de
    AWS_REGION    e.g. eu-central-1
    FRONTEND_URL  public address of the site, used in links

AWS credentials are NOT set here. On the server, boto3 picks them up from
the AWS permissions of the machine (IAM role), so no keys are in the code.

Without MAIL_FROM (local development) emails are only written to the log.
"""

import logging
import os

logger = logging.getLogger(__name__)

MAIL_FROM = os.getenv("MAIL_FROM")
AWS_REGION = os.getenv("AWS_REGION", "eu-central-1")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

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
    if not MAIL_FROM:
        logger.warning(
            "Email not sent (MAIL_FROM not set): %s -> %s\n%s",
            subject,
            to,
            body,
        )
        return
    try:
        _ses_client().send_email(
            Source=MAIL_FROM,
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