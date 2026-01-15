from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Optional

from pypdf import PdfReader


@dataclass(frozen=True)
class EmailContent:
    text: str
    source: str  # "text" | "txt" | "pdf"
    filename: Optional[str] = None


class EmailReader:
    def from_text(self, text: str) -> EmailContent:
        return EmailContent(text=text, source="text")

    def from_txt_bytes(self, data: bytes, filename: str | None = None) -> EmailContent:
        text = data.decode("utf-8", errors="ignore")
        return EmailContent(text=text, source="txt", filename=filename)

    def from_pdf_bytes(self, data: bytes, filename: str | None = None) -> EmailContent:
        reader = PdfReader(BytesIO(data))
        parts: list[str] = []

        for page in reader.pages:
            extracted = page.extract_text() or ""
            if extracted.strip():
                parts.append(extracted)

        text = "\n".join(parts).strip()
        return EmailContent(text=text, source="pdf", filename=filename)
