from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routes.health import router as health_router
from app.api.routes.email import router as email_router
from app.middlewares.exception_middleware import ExternalAiExceptionMiddleware

from app.core.response_factory import fail
from app.domain.models.api_response import ApiError


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="API para classificar emails e sugerir respostas (Produtivo/Improdutivo).",
    )

    # --- Exception handlers padronizados ---
    @app.exception_handler(HTTPException)
    async def http_exception_handler(_, exc: HTTPException):
        payload = fail(
            message=exc.detail if isinstance(exc.detail, str) else "Erro na requisição.",
            errors=[ApiError(code="HTTP_EXCEPTION", message=str(exc.detail))],
        ).model_dump()
        return JSONResponse(status_code=exc.status_code, content=payload)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_, exc: RequestValidationError):
        errors = [
            ApiError(
                code="VALIDATION_ERROR",
                message=e.get("msg", "Valor inválido"),
                field=".".join(str(x) for x in e.get("loc", []) if x != "body"),
            )
            for e in exc.errors()
        ]
        payload = fail(message="Erro de validação.", errors=errors).model_dump()
        return JSONResponse(status_code=422, content=payload)

    # --- CORS ---
    allowed = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]

    # Importante: com allow_credentials=True, evite ["*"] em produção.
    allow_origins = allowed if allowed else ["http://localhost:3000"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Middleware para erros externos (OpenAI) ---
    app.add_middleware(ExternalAiExceptionMiddleware)

    # --- Routers ---
    app.include_router(health_router)
    app.include_router(email_router)

    return app


app = create_app()
