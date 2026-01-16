from __future__ import annotations

import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.correlation import set_correlation_id, reset_correlation_id

logger = logging.getLogger("app.http")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    - Lê X-Correlation-Id se vier do cliente, senão gera UUID.
    - Guarda em contextvar (para logs) e devolve no response header.
    - Loga request_start e request_end com duration.
    """
    header_name = "X-Correlation-Id"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        cid = (request.headers.get(self.header_name) or str(uuid.uuid4())).strip()
        token = set_correlation_id(cid)

        start = time.perf_counter()
        client_ip = request.client.host if request.client else None

        logger.info(
            "request_start",
            extra={
                "event": "request_start",
                "method": request.method,
                "path": request.url.path,
                "client_ip": client_ip,
            },
        )

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = int((time.perf_counter() - start) * 1000)
            logger.exception(
                "request_error",
                extra={
                    "event": "request_error",
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                },
            )
            raise
        finally:
            # garante que o correlation id não vaze entre requests
            reset_correlation_id(token)

        duration_ms = int((time.perf_counter() - start) * 1000)

        # garante header no sucesso
        response.headers[self.header_name] = cid

        logger.info(
            "request_end",
            extra={
                "event": "request_end",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
            },
        )

        return response
