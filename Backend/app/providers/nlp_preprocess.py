from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Literal

import simplemma
from stopwordsiso import stopwords


Lang = Literal["pt", "en"]


@dataclass(frozen=True)
class NlpOutput:
    raw_text: str
    normalized_text: str
    lang: Lang
    lemmas: List[str]
    keywords: List[str]


class NlpPreprocess:
    """
    Requisito do case (NLP):
    - remoção de stopwords
    - lematização

    Observação: usamos o texto original para a IA responder com fluidez
    e enviamos keywords/lemmas como "sinais" auxiliares.
    """

    def __init__(self) -> None:
        self._stop_pt = stopwords("pt")
        self._stop_en = stopwords("en")

    def run(self, text: str) -> NlpOutput:
        raw = (text or "").strip()
        normalized = self._normalize(raw)

        lang = self._guess_lang(normalized)

        # Tokenização simples (evita dependências)
        tokens = self._tokenize(normalized)

        # Stopwords + Lemmatização
        lemmas: List[str] = []
        for tok in tokens:
            if self._is_url(tok):
                lemmas.append("<url>")
                continue
            if self._is_email(tok):
                lemmas.append("<email>")
                continue
            if tok.isdigit():
                lemmas.append("<num>")
                continue

            if self._is_stopword(tok, lang):
                continue

            lemma = self._lemmatize(tok, lang)
            lemma = lemma.lower().strip()

            if len(lemma) < 3:
                continue
            if not re.search(r"[a-zà-ÿ]", lemma):
                continue

            lemmas.append(lemma)

        keywords = self._unique_first(lemmas, limit=25)

        return NlpOutput(
            raw_text=raw,
            normalized_text=normalized,
            lang=lang,
            lemmas=lemmas,
            keywords=keywords,
        )

    def _normalize(self, text: str) -> str:
        t = text.strip()
        t = re.sub(r"\s+", " ", t)
        return t

    def _tokenize(self, text: str) -> List[str]:
        # tokens alfanuméricos (com acentos) e alguns símbolos comuns em emails
        return re.findall(r"[A-Za-zÀ-ÿ0-9_@.\-]+", text.lower())

    def _guess_lang(self, text: str) -> Lang:
        # Heurística leve usando stopwords:
        toks = re.findall(r"[A-Za-zÀ-ÿ]+", text.lower())
        if not toks:
            return "pt"

        en_hits = sum(1 for t in toks if t in self._stop_en)
        pt_hits = sum(1 for t in toks if t in self._stop_pt)
        return "en" if en_hits > pt_hits else "pt"

    def _is_stopword(self, token: str, lang: Lang) -> bool:
        return token in (self._stop_en if lang == "en" else self._stop_pt)

    def _lemmatize(self, token: str, lang: Lang) -> str:
        # Simplemma permite “chaining” de idiomas para melhorar cobertura.
        # Ex.: tentar PT e depois EN (ou vice-versa). :contentReference[oaicite:4]{index=4}
        if lang == "pt":
            return simplemma.lemmatize(token, lang=("pt", "en"))
        return simplemma.lemmatize(token, lang=("en", "pt"))

    def _unique_first(self, items: List[str], limit: int) -> List[str]:
        out: List[str] = []
        seen = set()
        for it in items:
            if it in seen:
                continue
            seen.add(it)
            out.append(it)
            if len(out) >= limit:
                break
        return out

    def _is_url(self, token: str) -> bool:
        return token.startswith("http://") or token.startswith("https://") or token.startswith("www.")

    def _is_email(self, token: str) -> bool:
        return "@" in token and "." in token
