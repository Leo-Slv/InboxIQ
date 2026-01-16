from __future__ import annotations

import re
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
        # mantém simples, mas normaliza quebras e espaços comuns
        return EmailContent(text=self._normalize(text or ""), source="text")

    def from_txt_bytes(self, data: bytes, filename: str | None = None) -> EmailContent:
        text = self._decode_text_bytes(data)
        return EmailContent(text=self._normalize(text), source="txt", filename=filename)

    def from_pdf_bytes(self, data: bytes, filename: str | None = None) -> EmailContent:
        reader = PdfReader(BytesIO(data))
        parts: list[str] = []

        for page in reader.pages:
            extracted = (page.extract_text() or "").strip()
            if extracted:
                parts.append(extracted)

        # usa \n\n entre páginas para manter “cara de e-mail”
        text = "\n\n".join(parts)
        return EmailContent(text=self._normalize(text), source="pdf", filename=filename)

    def _decode_text_bytes(self, data: bytes) -> str:
        """
        Decodifica bytes de txt com fallback comum em PT-BR.
        Mantém compatibilidade e evita travar em arquivos fora de UTF-8.
        """
        for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
            try:
                return data.decode(enc)
            except UnicodeDecodeError:
                continue
        return data.decode("utf-8", errors="ignore")

    def _normalize(self, text: str) -> str:
        """
        Normalização leve para preservar parágrafos:
        - normaliza CRLF/CR para LF
        - remove trailing spaces por linha
        - colapsa 3+ linhas em branco para 2
        """
        t = text.replace("\r\n", "\n").replace("\r", "\n")
        t = "\n".join(line.rstrip() for line in t.split("\n"))
        t = re.sub(r"(?m)^[ \t]+$", "", t)
        t = re.sub(r"\n{3,}", "\n\n", t)
        return t.strip()
