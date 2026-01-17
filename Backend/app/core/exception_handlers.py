from __future__ import annotations

import logging
from typing import Optional, List

from fastapi import Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.response_factory import fail
from app.core.correlation import get_correlation_id
from app.domain.models.api_response import ApiError

logger = logging.getLogger("app.exceptions")


def _as_json_response(*, status_code: int, message: str, errors: Optional[List[ApiError]] = None) -> JSONResponse:
    payload = fail(message=message, errors=errors).model_dump()
    return JSONResponse(status_code=status_code, content=payload)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Padroniza qualquer `raise HTTPException(...)`
    para ApiResponse.
    """
    # Se você já mandar um dict no detail (caso antigo),
    # dá pra respeitar, mas aqui vamos padronizar sempre.
    detail = exc.detail

    if isinstance(detail, str):
        message = detail
        errors = [ApiError(code="HTTP_ERROR", message=detail)]
    elif isinstance(detail, dict):
        # Suporta detail como { message, errors[] ... } se você já tiver algo assim
        message = str(detail.get("message") or "Erro na requisição.")
        raw_errors = detail.get("errors")
        errors = None

        if isinstance(raw_errors, list):
            parsed: list[ApiError] = []
            for e in raw_errors:
                if isinstance(e, dict):
                    parsed.append(ApiError(**e))
                else:
                    parsed.append(ApiError(code="HTTP_ERROR", message=str(e)))
            errors = parsed

        if errors is None:
            errors = [ApiError(code="HTTP_ERROR", message=message)]
    else:
        message = "Erro na requisição."
        errors = [ApiError(code="HTTP_ERROR", message=message)]

    logger.warning(
        "http_exception",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "correlation_id": get_correlation_id(),
        },
    )

    return _as_json_response(status_code=exc.status_code, message=message, errors=errors)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Padroniza o 422 automático do FastAPI/Pydantic
    para ApiResponse.
    """
    errors: list[ApiError] = []

    for err in exc.errors():
        loc = err.get("loc", [])
        msg = err.get("msg", "Campo inválido")
        typ = err.get("type", "validation_error")

        # Loc geralmente vem tipo: ("body", "email") -> "email"
        field = None
        if isinstance(loc, (list, tuple)) and len(loc) > 1:
            field = ".".join(str(x) for x in loc[1:])

        errors.append(
            ApiError(
                code="VALIDATION_ERROR",
                message=f"{msg} ({typ})",
                field=field,
            )
        )

    logger.info(
        "validation_error",
        extra={
            "status_code": 422,
            "path": request.url.path,
            "method": request.method,
            "correlation_id": get_correlation_id(),
        },
    )

    return _as_json_response(
        status_code=422,
        message="Dados inválidos. Verifique os campos enviados.",
        errors=errors,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Padroniza qualquer erro não tratado (500).
    """
    logger.exception(
        "unhandled_exception",
        extra={
            "status_code": 500,
            "path": request.url.path,
            "method": request.method,
            "correlation_id": get_correlation_id(),
        },
    )

    return _as_json_response(
        status_code=500,
        message="Erro interno inesperado.",
        errors=[ApiError(code="INTERNAL_ERROR", message="Unexpected error.")],
    )
