from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

from app.core.correlation import get_correlation_id


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "correlation_id": get_correlation_id(),
        }

        # Extras úteis (se vierem no logger.info(..., extra={...}))
        for key in ("event", "method", "path", "status_code", "duration_ms", "client_ip"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    """
    Configura logging do app inteiro.
    Controlado por env vars:
      - LOG_LEVEL (default INFO)
      - LOG_JSON (default true)
    """
    level_str = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_str, logging.INFO)

    log_json = os.getenv("LOG_JSON", "true").lower() in {"1", "true", "yes", "y"}

    root = logging.getLogger()
    root.setLevel(level)

    # remove handlers duplicados (reload/local)
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(JsonFormatter() if log_json else logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s - %(message)s"
    ))
    root.addHandler(handler)

    # reduzir ruído
    logging.getLogger("uvicorn.access").setLevel(level)
    logging.getLogger("uvicorn.error").setLevel(level)
