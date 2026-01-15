from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal, Any

Category = Literal["Produtivo", "Improdutivo"]


@dataclass(frozen=True)
class GuardedResult:
    category: Category
    suggested_reply: str
    confidence: float


class AiOutputGuard:
    def __init__(self, max_reply_chars: int = 900) -> None:
        self._max_reply_chars = max_reply_chars

    def ensure(self, category: Any, reply: Any, confidence: Any) -> GuardedResult:
        cat = self._normalize_category(category)

        clean_reply = self._sanitize_reply(reply)
        clean_reply = self._normalize_email_body(clean_reply)

        if not clean_reply:
            clean_reply = self._default_reply(cat)

        if len(clean_reply) > self._max_reply_chars:
            clean_reply = clean_reply[: self._max_reply_chars].rstrip() + "…"

        conf = self._normalize_confidence(confidence)

        return GuardedResult(category=cat, suggested_reply=clean_reply, confidence=conf)

    def _normalize_category(self, value: Any) -> Category:
        v = str(value or "").strip().lower()
        if v in {"produtivo", "productive"}:
            return "Produtivo"
        if v in {"improdutivo", "unproductive"}:
            return "Improdutivo"
        return "Produtivo"

    def _sanitize_reply(self, reply: Any) -> str:
        text = str(reply or "").strip()
        if text.startswith("```"):
            text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text).strip()
        return text

    def _normalize_email_body(self, text: str) -> str:
        """
        Normaliza o corpo do e-mail preservando a formatação humana:
        - mantém parágrafos (linha em branco)
        - remove ruídos comuns (CRLF, trailing spaces, excesso de linhas em branco)
        - não altera conteúdo sem necessidade
        """
        if not text:
            return ""

        # 1) Normaliza quebras de linha para \n
        t = text.replace("\r\n", "\n").replace("\r", "\n")

        # 2) Remove espaços/tabs no fim de cada linha (mantém indent se existir no começo)
        t = "\n".join(line.rstrip() for line in t.split("\n"))

        # 3) Linhas "em branco" com espaços viram linha em branco real
        # Ex.: "   " -> ""
        t = re.sub(r"(?m)^[ \t]+$", "", t)

        # 4) Colapsa excesso de linhas em branco:
        # 3+ quebras seguidas -> exatamente 2 (um parágrafo)
        t = re.sub(r"\n{3,}", "\n\n", t)

        # 5) Remove excesso de quebras no começo/fim sem destruir parágrafos internos
        t = t.strip("\n").strip()

        return t

    def _normalize_confidence(self, value: Any) -> float:
        try:
            conf = float(value)
        except (TypeError, ValueError):
            conf = 0.5
        return max(0.0, min(conf, 1.0))

    def _default_reply(self, category: Category) -> str:
        if category == "Produtivo":
            return (
                "Olá! Obrigado pelo contato. Para eu conseguir ajudar, você pode me informar "
                "mais detalhes do pedido e o contexto (ex.: qual sistema/erro e desde quando acontece)?"
            )
        return "Olá! Obrigado pela mensagem. Se precisar de algo, fico à disposição."
