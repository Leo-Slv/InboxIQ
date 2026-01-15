from pydantic import BaseModel, Field
from typing import Literal, Optional


EmailCategory = Literal["Produtivo", "Improdutivo"]


class EmailAnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, description="Conteúdo do email em texto puro")


class EmailAnalyzeResponse(BaseModel):
    category: EmailCategory
    suggested_reply: str
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
