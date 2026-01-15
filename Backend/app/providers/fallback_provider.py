from __future__ import annotations
from typing import Tuple

class HeuristicFallbackProvider:
    def classify_and_reply(self, text: str) -> Tuple[str, str, float]:
        t = (text or "").lower()

        auto_reply_signals = [
            "out of office", "fora do escritório", "resposta automática", "no-reply", "do not reply"
        ]

        action_signals = [
            "erro", "bug", "acesso", "senha", "falha", "incidente", "problema", "suporte",
            "cobrança", "fatura", "pagamento", "reembolso", "cancelamento",
            "permissão", "convite", "repositório", "github", "invite", "colaborador"
        ]

        marketing_signals = [
            "newsletter", "promo", "desconto", "oferta", "black friday", "marketing", "campanha"
        ]

        if any(s in t for s in auto_reply_signals):
            return ("Improdutivo", "Obrigado pelo aviso! Assim que você retornar, fico à disposição.", 0.70)

        # ação antes de marketing
        if any(s in t for s in action_signals):
            return (
                "Produtivo",
                "Olá! Obrigado pelo contato. Para avançarmos, você pode compartilhar mais detalhes do pedido "
                "(ex.: contexto, passos para reproduzir, mensagens de erro e desde quando ocorre)?",
                0.62,
            )

        if any(s in t for s in marketing_signals):
            return (
                "Improdutivo",
                "Olá! Obrigado por compartilhar. No momento, não tenho nenhuma ação necessária, mas agradeço o contato.",
                0.65
            )

        return ("Improdutivo", "Olá! Obrigado pela mensagem. Se precisar de algo, fico à disposição.", 0.55)
