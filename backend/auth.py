import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from database import db

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is not set. Generate one with: "
        'python -c "import secrets; print(secrets.token_hex(32))"'
    )

ALGORITHM = "HS256"

# A login expires after this many minutes WITHOUT activity. Only a login and
# an explicit POST /auth/activity extend a session. Normal protected requests
# (for example the automatic chat polling) only CHECK the session.
INACTIVITY_MINUTES = 60
ACCESS_TOKEN_EXPIRE_MINUTES = INACTIVITY_MINUTES

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


# ---------- sessions (one row per login, so one per device) ----------


def create_session(user_id: int) -> str:
    """Start a new session for a login and return its id."""
    session_id = uuid.uuid4().hex
    with db() as conn:
        conn.execute(
            "INSERT INTO sessions (id, user_id) VALUES (%s, %s)",
            (session_id, user_id),
        )
    return session_id


def touch_session(session_id: str) -> bool:
    """Extend a session. Returns False if it is already expired or ended;
    such a session is never reactivated. Check and update happen in one
    statement, so a session cannot expire in between."""
    with db() as conn:
        row = conn.execute(
            "UPDATE sessions SET last_activity_at = NOW() "
            "WHERE id = %s AND ended_at IS NULL "
            "AND last_activity_at > NOW() - make_interval(mins => %s) "
            "RETURNING id",
            (session_id, INACTIVITY_MINUTES),
        ).fetchone()
    return row is not None


def end_session(session_id: str) -> None:
    with db() as conn:
        conn.execute(
            "UPDATE sessions SET ended_at = NOW() "
            "WHERE id = %s AND ended_at IS NULL",
            (session_id,),
        )


# ---------- tokens ----------


def create_access_token(user_id: int, session_id: str) -> str:
    """A fresh token for a session. Its expiry is counted from now, so each
    renewal moves it forward and active users are not logged out one hour
    after the original login."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=INACTIVITY_MINUTES)
    payload = {"sub": str(user_id), "sid": session_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def user_from_token(token: str) -> Optional[dict]:
    """Return the user (id, name, email, session_id) if the token is valid
    AND its session is still active, otherwise None. Read-only: this never
    extends the session. Use it for the WebSocket as well."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
        session_id = str(payload["sid"])
    except (InvalidTokenError, KeyError, ValueError, TypeError):
        return None

    with db() as conn:
        return conn.execute(
            "SELECT u.id, u.name, u.email, s.id AS session_id "
            "FROM sessions s JOIN users u ON u.id = s.user_id "
            "WHERE s.id = %s AND s.user_id = %s AND s.ended_at IS NULL "
            "AND s.last_activity_at > NOW() - make_interval(mins => %s)",
            (session_id, user_id, INACTIVITY_MINUTES),
        ).fetchone()


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise credentials_error
    user = user_from_token(creds.credentials)
    if user is None:
        raise credentials_error
    return user