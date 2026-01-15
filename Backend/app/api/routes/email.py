from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.api.deps import get_email_service, get_email_reader
from app.core.response_factory import ok
from app.domain.models.api_response import ApiResponse
from app.domain.models.email_analysis import EmailAnalyzeRequest, EmailAnalyzeResponse
from app.providers.email_reader import EmailReader
from app.services.email_classifier_service import EmailClassifierService

router = APIRouter(prefix="/emails", tags=["Emails"])


@router.post("/analyze", response_model=ApiResponse[EmailAnalyzeResponse])
def analyze_email(
    payload: EmailAnalyzeRequest,
    service: EmailClassifierService = Depends(get_email_service),
) -> ApiResponse[EmailAnalyzeResponse]:
    result = service.analyze(payload.text)
    return ok(result, message="Email analisado com sucesso.")


@router.post("/analyze-file", response_model=ApiResponse[EmailAnalyzeResponse])
async def analyze_email_file(
    file: UploadFile = File(...),
    reader: EmailReader = Depends(get_email_reader),
    service: EmailClassifierService = Depends(get_email_service),
) -> ApiResponse[EmailAnalyzeResponse]:
    filename = (file.filename or "").lower()
    if not (filename.endswith(".txt") or filename.endswith(".pdf")):
        raise HTTPException(status_code=400, detail="Envie um arquivo .txt ou .pdf")

    data = await file.read()

    if filename.endswith(".pdf"):
        content = reader.from_pdf_bytes(data, filename=file.filename)
    else:
        content = reader.from_txt_bytes(data, filename=file.filename)

    if not content.text.strip():
        raise HTTPException(status_code=422, detail="Não foi possível extrair texto do arquivo.")

    result = service.analyze(content.text)
    return ok(result, message="Arquivo analisado com sucesso.")
