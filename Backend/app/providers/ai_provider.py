from pydantic import BaseModel
from typing import Literal, Protocol, Sequence, Tuple


class AiResult(BaseModel):
    category: Literal["Produtivo", "Improdutivo"]
    suggested_reply: str
    confidence: float

class AiProvider(Protocol):
    def classify_and_reply(self, text: str, keywords: Sequence[str]) -> Tuple[str, str, float]:
        ...