import re

_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_INJECTION = re.compile(
    r"(ignore (all |any )?(previous|prior|above) (instructions|prompts)|disregard .{0,30}instructions|"
    r"you are now|system prompt|reveal .{0,30}(prompt|key|secret))",
    re.IGNORECASE,
)


def clean_text(value: str | None, max_len: int = 20000) -> str:
    if not value:
        return ""
    return _CONTROL.sub("", value).strip()[:max_len]


def injection_suspected(*texts: str) -> bool:
    return any(_INJECTION.search(t or "") for t in texts)
