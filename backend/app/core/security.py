import hmac
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status

from app.core.config import Settings, get_settings

ROLE_RANK = {"viewer": 1, "editor": 2, "admin": 3}


@dataclass
class User:
    name: str
    role: str


def get_current_user(
    x_api_key: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> User:
    if not settings.auth_enabled:
        return User(name="local-dev", role="admin")
    if not x_api_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-API-Key header")
    for key, (role, name) in settings.parsed_api_keys().items():
        if hmac.compare_digest(key, x_api_key):
            return User(name=name, role=role)
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")


def require_role(minimum: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if ROLE_RANK[user.role] < ROLE_RANK[minimum]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires {minimum} role")
        return user

    return checker
