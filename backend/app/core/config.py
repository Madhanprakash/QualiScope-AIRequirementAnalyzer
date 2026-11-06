from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5-5"
    ai_timeout_seconds: float = 90
    ai_max_retries: int = 3

    database_url: str = "sqlite:///./qualiscope.db"

    api_keys: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_upload_mb: int = 5
    log_level: str = "INFO"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def auth_enabled(self) -> bool:
        return bool(self.api_keys.strip())

    def parsed_api_keys(self) -> dict[str, tuple[str, str]]:
        """Returns {api_key: (role, username)}."""
        result: dict[str, tuple[str, str]] = {}
        for entry in self.api_keys.split(","):
            parts = [p.strip() for p in entry.split(":")]
            if len(parts) >= 2 and parts[0]:
                role = parts[1] if parts[1] in ("admin", "editor", "viewer") else "viewer"
                result[parts[0]] = (role, parts[2] if len(parts) > 2 else role)
        return result


@lru_cache
def get_settings() -> Settings:
    return Settings()
