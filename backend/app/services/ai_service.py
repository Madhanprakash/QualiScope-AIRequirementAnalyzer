"""LLM access layer (Anthropic Claude): schema-constrained JSON via forced tool use, timeouts, retries."""
import logging
import time
from typing import Protocol, TypeVar

from pydantic import BaseModel, ValidationError

from app.core.config import get_settings

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


class AIUnavailable(Exception):
    """AI backend not configured or permanently failing."""


class LLMClient(Protocol):
    def complete(self, system: str, user: str, schema: type[T]) -> T: ...


class ClaudeClient:
    def __init__(self) -> None:
        s = get_settings()
        if not s.anthropic_api_key:
            raise AIUnavailable("ANTHROPIC_API_KEY is not configured on the server.")
        import anthropic

        self._client = anthropic.Anthropic(api_key=s.anthropic_api_key, timeout=s.ai_timeout_seconds, max_retries=0)
        self._model = s.anthropic_model
        self._retries = max(1, s.ai_max_retries)

    def complete(self, system: str, user: str, schema: type[T]) -> T:
        import anthropic

        tool = {
            "name": "submit_result",
            "description": "Submit the final structured result.",
            "input_schema": schema.model_json_schema(),
        }
        last: Exception | None = None
        for attempt in range(1, self._retries + 1):
            try:
                resp = self._client.messages.create(
                    model=self._model,
                    max_tokens=16000,
                    system=system,
                    messages=[{"role": "user", "content": user}],
                    tools=[tool],
                )
                block = next((b for b in resp.content if b.type == "tool_use"), None)
                if block is None:
                    raise ValueError("Model returned no structured output")
                return schema.model_validate(block.input)
            except anthropic.AuthenticationError as exc:
                raise AIUnavailable("Anthropic authentication failed. Check ANTHROPIC_API_KEY.") from exc
            except (anthropic.RateLimitError, anthropic.APITimeoutError, anthropic.APIConnectionError, anthropic.InternalServerError, ValueError, ValidationError, TypeError) as exc:
                last = exc
                log.warning("AI call failed (attempt %s/%s): %s", attempt, self._retries, type(exc).__name__)
                if attempt < self._retries:
                    time.sleep(min(2**attempt, 8))
            except anthropic.APIStatusError as exc:
                raise AIUnavailable(f"Claude request failed ({exc.status_code}).") from exc
        raise AIUnavailable("AI service did not respond successfully after retries.") from last


_override: LLMClient | None = None


def set_llm_client(client: LLMClient | None) -> None:
    """Used by tests to inject a fake client."""
    global _override
    _override = client


def get_llm() -> LLMClient:
    return _override or ClaudeClient()
