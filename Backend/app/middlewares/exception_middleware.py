from __future__ import annotations

import logging
from typing import Optional, Any, Dict, List

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from openai import (
    AuthenticationError,
    RateLimitError,
    APITimeoutError,
    APIConnectionError,
    APIStatusError,
)

from app.core.response_factory import fail
from app.domain.models.api_response import ApiError

logger = logging.getLogger(__name__)


class ExternalAiExceptionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)

        except AuthenticationError as exc:
            logger.exception("OpenAI auth error: %s", exc)
            return self._respond(
                status_code=500,
                message="Falha de autenticação com o provedor de IA. Verifique OPENAI_API_KEY.",
                errors=[ApiError(code="OPENAI_AUTH_ERROR", message="OPENAI_API_KEY inválida/ausente.")],
                provider_request_id=self._extract_request_id(exc),
            )

        except RateLimitError as exc:
            logger.exception("OpenAI rate limit/quota error: %s", exc)
            err_code = self._extract_openai_error_code(exc)
            if err_code == "insufficient_quota":
                return self._respond(
                    status_code=503,
                    message="Sem créditos/quota no provedor de IA. Verifique billing/limite de gastos.",
                    errors=[ApiError(code="OPENAI_INSUFFICIENT_QUOTA", message="Insufficient quota.")],
                    provider_request_id=self._extract_request_id(exc),
                )

            return self._respond(
                status_code=503,
                message="O provedor de IA está com muitas requisições no momento. Tente novamente.",
                errors=[ApiError(code="OPENAI_RATE_LIMIT", message="Rate limit.")],
                provider_request_id=self._extract_request_id(exc),
            )

        except (APITimeoutError, APIConnectionError) as exc:
            logger.exception("OpenAI network/timeout error: %s", exc)
            return self._respond(
                status_code=503,
                message="O provedor de IA está indisponível no momento. Tente novamente.",
                errors=[ApiError(code="OPENAI_UNAVAILABLE", message="Network/timeout.")],
                provider_request_id=self._extract_request_id(exc),
            )

        except APIStatusError as exc:
            logger.exception("OpenAI status error: %s", exc)
            return self._respond(
                status_code=502,
                message="Falha ao consultar o provedor de IA.",
                errors=[ApiError(code="OPENAI_BAD_GATEWAY", message="Provider returned an error.")],
                provider_request_id=self._extract_request_id(exc),
            )

        except Exception as exc:
            logger.exception("Unhandled error: %s", exc)
            return self._respond(
                status_code=500,
                message="Erro interno inesperado.",
                errors=[ApiError(code="INTERNAL_ERROR", message="Unexpected error.")],
                provider_request_id=None,
            )

    def _respond(
        self,
        *,
        status_code: int,
        message: str,
        errors: List[ApiError],
        provider_request_id: Optional[str],
    ) -> JSONResponse:
        payload = fail(message=message, errors=errors).model_dump()
        if provider_request_id:
            # se quiser expor ID do provedor para suporte/debug
            payload["errors"].append(ApiError(code="PROVIDER_REQUEST_ID", message=provider_request_id).model_dump())
        return JSONResponse(status_code=status_code, content=payload)

    def _extract_request_id(self, exc: Exception) -> Optional[str]:
        response = getattr(exc, "response", None)
        if response is None:
            return None
        headers = getattr(response, "headers", None)
        if not headers:
            return None
        return headers.get("x-request-id") or headers.get("request-id")

    def _extract_openai_error_code(self, exc: Exception) -> Optional[str]:
        body = getattr(exc, "body", None)
        if isinstance(body, dict):
            err = body.get("error") or {}
            code = err.get("code")
            if isinstance(code, str):
                return code
        return None
