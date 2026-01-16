from __future__ import annotations

import logging

from app.domain.models.email_analysis import EmailAnalyzeResponse
from app.providers.ai_provider import AiProvider
from app.providers.nlp_preprocess import NlpPreprocess
from app.providers.fallback_provider import HeuristicFallbackProvider
from app.services.ai_output_guard import AiOutputGuard

logger = logging.getLogger(__name__)


class EmailClassifierService:
    def __init__(self, ai: AiProvider, nlp: NlpPreprocess) -> None:
        self._ai = ai
        self._nlp = nlp
        self._guard = AiOutputGuard()
        self._fallback = HeuristicFallbackProvider()

    def analyze(self, raw_text: str) -> EmailAnalyzeResponse:
        nlp_out = self._nlp.run(raw_text)

        try:
            category, reply, confidence = self._ai.classify_and_reply(
                nlp_out.raw_text,
                nlp_out.keywords,
            )
        except Exception:
            # loga a exceção pra você enxergar no container/CloudWatch
            logger.exception(
                "ai_provider_failed_using_fallback",
                extra={"event": "ai_provider_failed_using_fallback"},
            )
            category, reply, confidence = self._fallback.classify_and_reply(nlp_out)

        safe = self._guard.ensure(category, reply, confidence)

        return EmailAnalyzeResponse(
            category=safe.category,
            suggested_reply=safe.suggested_reply,
            confidence=safe.confidence,
        )
