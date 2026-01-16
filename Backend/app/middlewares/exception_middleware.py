from __future__ import annotations

import logging
from typing import Optional, List

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
from app.core.correlation import get_correlation_id
from app.domain.models.api_response import ApiError

logger = logging.getLogger("app.external_ai")


class ExternalAiExceptionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)

        except AuthenticationError as exc:
            provider_request_id = self._extract_request_id(exc)
            self._log_exception(
                exc,
                event="openai_auth_error",
                request=request,
                status_code=500,
                provider_request_id=provider_request_id,
            )
            return self._respond(
                status_code=500,
                message="Falha de autenticação com o provedor de IA. Verifique OPENAI_API_KEY.",
                errors=[ApiError(code="OPENAI_AUTH_ERROR", message="OPENAI_API_KEY inválida/ausente.")],
                provider_request_id=provider_request_id,
            )

        except RateLimitError as exc:
            provider_request_id = self._extract_request_id(exc)
            err_code = self._extract_openai_error_code(exc)

            if err_code == "insufficient_quota":
                self._log_exception(
                    exc,
                    event="openai_insufficient_quota",
                    request=request,
                    status_code=503,
                    provider_request_id=provider_request_id,
                )
                return self._respond(
                    status_code=503,
                    message="Sem créditos/quota no provedor de IA. Verifique billing/limite de gastos.",
                    errors=[ApiError(code="OPENAI_INSUFFICIENT_QUOTA", message="Insufficient quota.")],
                    provider_request_id=provider_request_id,
                )

            self._log_exception(
                exc,
                event="openai_rate_limit",
                request=request,
                status_code=503,
                provider_request_id=provider_request_id,
            )
            return self._respond(
                status_code=503,
                message="O provedor de IA está com muitas requisições no momento. Tente novamente.",
                errors=[ApiError(code="OPENAI_RATE_LIMIT", message="Rate limit.")],
                provider_request_id=provider_request_id,
            )

        except (APITimeoutError, APIConnectionError) as exc:
            provider_request_id = self._extract_request_id(exc)
            self._log_exception(
                exc,
                event="openai_unavailable",
                request=request,
                status_code=503,
                provider_request_id=provider_request_id,
            )
            return self._respond(
                status_code=503,
                message="O provedor de IA está indisponível no momento. Tente novamente.",
                errors=[ApiError(code="OPENAI_UNAVAILABLE", message="Network/timeout.")],
                provider_request_id=provider_request_id,
            )

        except APIStatusError as exc:
            provider_request_id = self._extract_request_id(exc)
            self._log_exception(
                exc,
                event="openai_bad_gateway",
                request=request,
                status_code=502,
                provider_request_id=provider_request_id,
            )
            return self._respond(
                status_code=502,
                message="Falha ao consultar o provedor de IA.",
                errors=[ApiError(code="OPENAI_BAD_GATEWAY", message="Provider returned an error.")],
                provider_request_id=provider_request_id,
            )

        except Exception as exc:
            self._log_exception(
                exc,
                event="unhandled_error",
                request=request,
                status_code=500,
                provider_request_id=None,
            )
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

        # ✅ evita duplicar errors e mantém tipo consistente (list[dict])
        if provider_request_id:
            payload_errors = payload.get("errors") or []
            payload_errors.append(
                ApiError(code="PROVIDER_REQUEST_ID", message=provider_request_id).model_dump()
            )
            payload["errors"] = payload_errors

        return JSONResponse(status_code=status_code, content=payload)

    def _extract_request_id(self, exc: Exception) -> Optional[str]:
        response = getattr(exc, "response", None)
        headers = getattr(response, "headers", None) if response is not None else None
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

    def _log_exception(
        self,
        exc: Exception,
        *,
        event: str,
        request: Request,
        status_code: int,
        provider_request_id: Optional[str],
    ) -> None:
        """
        Log estruturado com contexto mínimo útil:
        - correlation_id (do middleware)
        - método/rota
        - status_code esperado
        - provider_request_id (se existir)
        """
        logger.exception(
            "external_ai_error",
            extra={
                "event": event,
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "provider_request_id": provider_request_id,
                "correlation_id": get_correlation_id(),
            },
        )
