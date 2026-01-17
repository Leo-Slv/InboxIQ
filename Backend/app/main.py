from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.api.routes.health import router as health_router
from app.api.routes.email import router as email_router
from app.middlewares.correlation_id_middleware import CorrelationIdMiddleware
from app.middlewares.externalAiExceptionMiddleware import ExternalAiExceptionMiddleware
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError

from app.core.exception_handlers import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)

openapi_tags = [
    {"name": "Health", "description": "Endpoints de verificação de saúde e disponibilidade."},
    {"name": "Emails", "description": (
        "Classificação de emails (Produtivo/Improdutivo) e sugestão de resposta no formato de email.\n\n"
        "**Fluxo:** texto bruto → NLP (stopwords + lematização) → IA (OpenAI) → validação/normalização → resposta.\n"
        "Suporta envio de texto direto ou arquivo `.txt` / `.pdf`."
    )},
]


def create_app() -> FastAPI:
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "API para classificar emails e sugerir respostas automáticas.\n\n"
            "- **Entrada:** texto ou arquivo `.txt/.pdf`\n"
            "- **Saída:** categoria + resposta sugerida + confiança\n"
            "- **Padrão de resposta:** `{ success, message, data, errors }`"
        ),
        openapi_tags=openapi_tags,
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        contact={"name": "InboxIQ API"},
        license_info={"name": "Proprietary"},
        servers=[{"url": "http://localhost:8000", "description": "Local"}],
    )

    allowed = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 1) exceções primeiro
    app.add_middleware(ExternalAiExceptionMiddleware)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    # 2) correlation por último (tende a ficar “mais externo”)
    app.add_middleware(CorrelationIdMiddleware)

    app.include_router(health_router, tags=["Health"])
    app.include_router(email_router, tags=["Emails"])
    return app


app = create_app()
