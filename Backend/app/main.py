from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes.health import router as health_router
from app.api.routes.email import router as email_router
from app.middlewares.exception_middleware import ExternalAiExceptionMiddleware


openapi_tags = [
    {
        "name": "Health",
        "description": "Endpoints de verificação de saúde e disponibilidade.",
    },
    {
        "name": "Emails",
        "description": (
            "Classificação de emails (Produtivo/Improdutivo) e sugestão de resposta no formato de email.\n\n"
            "**Fluxo:** texto bruto → NLP (stopwords + lematização) → IA (OpenAI) → validação/normalização → resposta.\n"
            "Suporta envio de texto direto ou arquivo `.txt` / `.pdf`."
        ),
    },
]


def create_app() -> FastAPI:
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

        # Swagger / OpenAPI (seguro; não quebra nada)
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",

        # Metadata (opcional)
        contact={
            "name": "InboxIQ API",
        },
        license_info={
            "name": "Proprietary",
        },

        # Servers (opcional; ajuda no Swagger quando tiver URL pública)
        servers=[
            {"url": "http://localhost:8000", "description": "Local"},
            # Quando tiver AWS/Vercel, você pode setar via env e atualizar depois
            # {"url": "https://sua-api.aws.com", "description": "Produção"},
        ],
    )

    allowed = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(ExternalAiExceptionMiddleware)

    # Mantive tags aqui também (ok) — aparecem agrupadas no Swagger
    app.include_router(health_router, tags=["Health"])
    app.include_router(email_router, tags=["Emails"])

    return app


app = create_app()
