from __future__ import annotations

from typing import Tuple, Literal, Sequence
from pydantic import BaseModel, Field
from openai import OpenAI
from openai import RateLimitError, APIConnectionError, APITimeoutError, AuthenticationError

from app.providers.ai_provider import AiProvider
from app.services.prompt_policy import PromptPolicy

EmailCategory = Literal["Produtivo", "Improdutivo"]

class ModelResult(BaseModel):
    category: EmailCategory
    suggested_reply: str = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)

class OpenAiEmailProvider(AiProvider):
    def __init__(self, api_key: str, model: str, policy: PromptPolicy) -> None:
        self._client = OpenAI(api_key=api_key)
        self._model = model
        self._policy = policy

    def classify_and_reply(self, text: str, keywords: Sequence[str]) -> Tuple[str, str, float]:
        system = self._policy.build_system()
        user = self._policy.build_user(text, list(keywords))
        ...

        last_exc: Exception | None = None
        for _ in range(2):  # 2 tentativas (simples e suficiente no MVP)
            try:
                resp = self._client.responses.parse(
                    model=self._model,
                    input=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    text_format=ModelResult,
                )
                parsed: ModelResult = resp.output_parsed
                return (parsed.category, parsed.suggested_reply, float(parsed.confidence))

            except (RateLimitError, APIConnectionError, APITimeoutError) as e:
                last_exc = e
                continue
            except AuthenticationError as e:
                raise e

        # deixa a camada de serviço decidir fallback
        raise last_exc or RuntimeError("Falha desconhecida ao consultar OpenAI.")
