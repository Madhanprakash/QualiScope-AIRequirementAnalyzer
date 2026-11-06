import io

from fastapi import HTTPException

ALLOWED = {".pdf", ".docx", ".txt"}


def extract_text(filename: str, content: bytes, max_bytes: int) -> str:
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED:
        raise HTTPException(415, "Unsupported file type. Upload PDF, DOCX or TXT.")
    if len(content) > max_bytes:
        raise HTTPException(413, f"File exceeds the {max_bytes // (1024 * 1024)} MB limit.")
    try:
        if ext == ".txt":
            return content.decode("utf-8", errors="replace")
        if ext == ".pdf":
            from pypdf import PdfReader

            return "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(content)).pages)
        import docx

        d = docx.Document(io.BytesIO(content))
        parts = [p.text for p in d.paragraphs]
        for t in d.tables:
            for row in t.rows:
                parts.append(" | ".join(c.text for c in row.cells))
        return "\n".join(parts)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "Could not read the document. It may be corrupt or encrypted.")
