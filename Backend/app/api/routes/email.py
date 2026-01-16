from __future__ import annotations

import asyncio
import logging
import os
import tempfile
import time
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from starlette import status

from app.api.deps import get_email_service, get_email_reader
from app.core.response_factory import ok
from app.domain.models.api_response import ApiResponse
from app.domain.models.email_analysis import EmailAnalyzeRequest, EmailAnalyzeResponse
from app.providers.email_reader import EmailReader
from app.services.email_classifier_service import EmailClassifierService

router = APIRouter(prefix="/emails", tags=["Emails"])

logger = logging.getLogger(__name__)

# Limites e parâmetros (pode controlar por ENV sem rebuild)
MAX_UPLOAD_BYTES = int(os.getenv("EMAIL_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))  # 10MB
UPLOAD_CHUNK_SIZE = int(os.getenv("EMAIL_UPLOAD_CHUNK_SIZE", str(1024 * 1024)))  # 1MB


def _is_allowed_filename(filename: str) -> bool:
    f = (filename or "").strip().lower()
    return f.endswith(".txt") or f.endswith(".pdf")


async def _save_upload_to_tempfile(upload: UploadFile) -> tuple[str, int]:
    """
    Salva UploadFile em arquivo temporário usando streaming.
    Retorna (tmp_path, size_bytes).

    Evita carregar arquivo inteiro em memória (RAM), reduz chance de OOM.
    """
    suffix = ""
    if upload.filename:
        name = upload.filename.strip().lower()
        if name.endswith(".pdf"):
            suffix = ".pdf"
        elif name.endswith(".txt"):
            suffix = ".txt"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    size = 0

    try:
        while True:
            chunk = await upload.read(UPLOAD_CHUNK_SIZE)
            if not chunk:
                break

            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Arquivo muito grande. Limite: {MAX_UPLOAD_BYTES // (1024 * 1024)}MB",
                )

            tmp.write(chunk)

        tmp.flush()
        return tmp.name, size

    finally:
        tmp.close()


@router.post(
    "/analyze",
    response_model=ApiResponse[EmailAnalyzeResponse],
    summary="Analisar email por texto",
    description=(
        "Recebe o texto do email e retorna:\n"
        "- `category`: Produtivo | Improdutivo\n"
        "- `suggested_reply`: resposta sugerida em pt-BR no formato de email\n"
        "- `confidence`: 0..1\n\n"
        "O texto passa por pré-processamento NLP (stopwords + lematização) antes de consultar a IA."
    ),
)
def analyze_email(
    payload: EmailAnalyzeRequest,
    service: EmailClassifierService = Depends(get_email_service),
) -> ApiResponse[EmailAnalyzeResponse]:
    # OBS: endpoint sync já roda em threadpool do FastAPI, então não bloqueia o event loop.
    result = service.analyze(payload.text)
    return ok(result, message="Email analisado com sucesso.")


@router.post(
    "/analyze-file",
    response_model=ApiResponse[EmailAnalyzeResponse],
    summary="Analisar email por arquivo (.txt ou .pdf)",
    description=(
        "Recebe um arquivo `.txt` ou `.pdf` via **multipart/form-data** (campo `file`).\n\n"
        "Fluxo:\n"
        "1) Extrai texto do arquivo\n"
        "2) Aplica NLP (stopwords + lematização)\n"
        "3) Classifica e gera resposta via IA\n\n"
        "**Observação:** PDFs escaneados (imagem) podem não conter texto extraível."
    ),
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "file": {"type": "string", "format": "binary"}
                        },
                        "required": ["file"],
                    }
                }
            }
        }
    },
)
async def analyze_email_file(
    file: UploadFile = File(...),
    reader: EmailReader = Depends(get_email_reader),
    service: EmailClassifierService = Depends(get_email_service),
) -> ApiResponse[EmailAnalyzeResponse]:
    started = time.perf_counter()

    filename_raw = file.filename or ""
    filename = filename_raw.strip().lower()

    if not _is_allowed_filename(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie um arquivo .txt ou .pdf",
        )

    # 1) Salva arquivo temporário SEM carregar tudo em RAM
    tmp_path, size_bytes = await _save_upload_to_tempfile(file)

    try:
        # 2) Extrai texto (PDF/TXT) usando processamento por PATH (menos memória)
        #    e joga em thread para não travar o event loop do UvicornWorker.
        if filename.endswith(".pdf"):
            content = await asyncio.to_thread(
                reader.from_pdf_path,
                tmp_path,
                filename=filename_raw,
            )
        else:
            content = await asyncio.to_thread(
                reader.from_txt_path,
                tmp_path,
                filename=filename_raw,
            )

        if not content.text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Não foi possível extrair texto do arquivo.",
            )

        # 3) Classificação + IA: também em thread (CPU bound + IO bound dependendo do provider)
        result = await asyncio.to_thread(service.analyze, content.text)

        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "analyze_file_success",
            extra={
                "event": "analyze_file_success",
                "upload_filename": filename_raw,
                "size_bytes": size_bytes,
                "duration_ms": duration_ms,
            },
        )

        return ok(result, message="Arquivo analisado com sucesso.")

    except HTTPException:
        # mantém HTTPExceptions como estão
        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "analyze_file_http_error",
            extra={
                "event": "analyze_file_http_error",
                "upload_filename": filename_raw,
                "size_bytes": size_bytes,
                "duration_ms": duration_ms,
            },
        )
        raise

    except Exception:
        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.exception(
            "analyze_file_unexpected_error",
            extra={
                "event": "analyze_file_unexpected_error",
                "upload_filename": filename_raw,
                "size_bytes": size_bytes,
                "duration_ms": duration_ms,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha inesperada ao analisar o arquivo.",
        )

    finally:
        # garante cleanup do arquivo temporário
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            logger.warning(
                "failed_to_delete_tempfile",
                extra={
                    "event": "failed_to_delete_tempfile",
                    "tmp_path": tmp_path,
                },
            )
