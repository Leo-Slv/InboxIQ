from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from starlette import status

from app.api.deps import get_email_service, get_email_reader
from app.core.response_factory import ok
from app.domain.models.api_response import ApiResponse
from app.domain.models.email_analysis import EmailAnalyzeRequest, EmailAnalyzeResponse
from app.providers.email_reader import EmailReader
from app.services.email_classifier_service import EmailClassifierService

router = APIRouter(prefix="/emails", tags=["Emails"])


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
    filename = (file.filename or "").strip().lower()

    if not (filename.endswith(".txt") or filename.endswith(".pdf")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie um arquivo .txt ou .pdf",
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo vazio.",
        )

    if filename.endswith(".pdf"):
        content = reader.from_pdf_bytes(data, filename=file.filename)
    else:
        content = reader.from_txt_bytes(data, filename=file.filename)

    if not content.text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Não foi possível extrair texto do arquivo.",
        )

    result = service.analyze(content.text)
    return ok(result, message="Arquivo analisado com sucesso.")
