from __future__ import annotations

from functools import lru_cache

from fastapi import HTTPException
from starlette import status

from app.core.config import settings
from app.providers.email_reader import EmailReader
from app.providers.nlp_preprocess import NlpPreprocess
from app.providers.openai_provider import OpenAiEmailProvider
from app.services.email_classifier_service import EmailClassifierService

from app.services.prompt_policy import PromptPolicy


@lru_cache
def get_email_reader() -> EmailReader:
    return EmailReader()


@lru_cache
def get_nlp_preprocess() -> NlpPreprocess:
    return NlpPreprocess()


@lru_cache
def get_prompt_policy() -> PromptPolicy:
    return PromptPolicy()


def _ensure_openai_config() -> None:
    if not (settings.openai_api_key or "").strip():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY não configurada.",
        )
    if not (settings.openai_model or "").strip():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_MODEL não configurada.",
        )


@lru_cache
def get_ai_provider() -> OpenAiEmailProvider:
    _ensure_openai_config()
    return OpenAiEmailProvider(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        policy=get_prompt_policy(),
    )


def get_email_service() -> EmailClassifierService:
    return EmailClassifierService(
        ai=get_ai_provider(),
        nlp=get_nlp_preprocess(),
    )
