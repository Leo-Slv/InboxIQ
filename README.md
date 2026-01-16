# 📧 InboxIQ Backend

<div align="center">

**Classificação inteligente de emails com IA e sugestões automáticas de resposta**

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com/)

</div>

---

## 🎯 Sobre o Projeto

Backend desenvolvido para o case **AutoU** que automatiza a triagem de alto volume de emails, classificando-os como **Produtivo** ou **Improdutivo** e gerando **sugestões de resposta automática** utilizando GPT da OpenAI.

### Por que InboxIQ?

- ⚡ **Reduz esforço manual** da equipe de suporte
- 🎯 **Prioriza emails importantes** automaticamente
- 🤖 **Sugestões de resposta** com formatação profissional
- 📄 **Suporte a múltiplos formatos** (texto, PDF)
- 🛡️ **Fallback robusto** quando a IA não está disponível

---

## ✨ Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| 🏷️ **Classificação Inteligente** | Categoriza emails como Produtivo/Improdutivo |
| ✍️ **Sugestão de Resposta** | Gera texto formatado pronto para envio |
| 🧹 **Pré-processamento NLP** | Remove stopwords e aplica lematização |
| 📎 **Upload de Arquivos** | Aceita `.txt` e `.pdf` com extração automática |
| 🔄 **Sistema de Fallback** | Heurística quando IA falha (quota/timeout) |
| 🛡️ **Output Guard** | Valida e normaliza respostas da IA |
| 📊 **API Padronizada** | Envelope consistente em todas as rotas |
| 📚 **Documentação Automática** | Swagger UI integrado |

---

## 🏗️ Arquitetura

```
┌─────────────┐
│   API       │  ← Endpoints e validação (FastAPI)
└─────┬───────┘
      │
┌─────▼───────┐
│  Services   │  ← Orquestração do fluxo
└─────┬───────┘
      │
┌─────▼───────────────────────────┐
│         Providers               │
├─────────────────────────────────┤
│ • EmailReader (TXT/PDF)         │
│ • NlpPreprocess (Lematização)   │
│ • OpenAiEmailProvider (IA)      │
│ • HeuristicFallbackProvider     │
└─────────────────────────────────┘
```

### Camadas

- **API (routes)**: Define endpoints REST e valida payload
- **Services**: Orquestra NLP → IA → Guard → Resposta
- **Providers**: Componentes especializados (leitura, processamento, IA)
- **Policies**: `PromptPolicy` centraliza instruções para consistência
- **Middlewares**: Padronização de erros e tratamento de falhas

---

## 🔌 API Endpoints

### 📝 Analisar Texto

```http
POST /emails/analyze
Content-Type: application/json

{
  "text": "Boa tarde, gostaria de saber o status do meu chamado..."
}
```

### 📎 Analisar Arquivo

```http
POST /emails/analyze-file
Content-Type: multipart/form-data

file: arquivo.pdf ou arquivo.txt
```

### 📦 Formato de Resposta

**Sucesso:**
```json
{
  "success": true,
  "message": "Email analisado com sucesso.",
  "data": {
    "category": "Produtivo",
    "suggested_reply": "Olá...\n\nAtenciosamente,\n[Seu nome]",
    "confidence": 0.94
  },
  "errors": null
}
```

**Erro:**
```json
{
  "success": false,
  "message": "Erro de validação.",
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Campo obrigatório",
      "field": "text"
    }
  ]
}
```

---

## 🚀 Começando

### Pré-requisitos

- Python 3.9+
- Chave de API da OpenAI
- (Opcional) Docker

### ⚙️ Configuração

1. **Clone o repositório**
```bash
git clone <seu-repo>
cd InboxIQ/backend
```

2. **Crie o ambiente virtual**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
# ou
source .venv/bin/activate      # Linux/Mac
```

3. **Instale as dependências**
```bash
pip install -r requirements.txt
```

4. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do backend:

```env
# App
APP_NAME=AutoU InboxIQ API
APP_VERSION=0.1.0

# CORS (separado por vírgula)
ALLOWED_ORIGINS=http://localhost:3000,https://seu-front.vercel.app

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=
OPENAI_TIMEOUT=30
```

> ⚠️ **Importante**: Nunca commite o arquivo `.env` no Git!

---

## 💻 Rodando Localmente

### Modo Desenvolvimento

```powershell
# Windows
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Linux/Mac
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Acesse:
- 🌐 API: http://localhost:8000
- 📚 Swagger UI: http://localhost:8000/docs
- 📋 OpenAPI JSON: http://localhost:8000/openapi.json

---

## 🐳 Rodando com Docker

### Build da Imagem

```bash
cd backend
docker build -t autou-inboxiq-api .
```

### Executar Container

```bash
docker run --rm -p 8000:8000 --env-file .env autou-inboxiq-api
```

Acesse: http://localhost:8000/docs

---

## 🧪 Testando a API

### Com cURL

```bash
# Análise de texto
curl -X POST http://localhost:8000/emails/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Gostaria de saber o status do meu pedido #1234"}'

# Upload de arquivo
curl -X POST http://localhost:8000/emails/analyze-file \
  -F "file=@email.pdf"
```

### Com Postman

1. **POST** `/emails/analyze`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
   ```json
   {
     "text": "Boa tarde, gostaria de saber o status do meu chamado..."
   }
   ```

2. **POST** `/emails/analyze-file`
   - Body: form-data
   - Key: `file` (tipo File)
   - Value: selecione arquivo `.pdf` ou `.txt`

---

## 🧠 Pipeline de Processamento NLP

O backend aplica processamento antes de enviar para a IA:

```
Email Original
    ↓
1. Normalização
    ↓
2. Tokenização
    ↓
3. Remoção de Stopwords (PT/EN)
    ↓
4. Lematização (simplemma)
    ↓
5. Extração de Keywords
    ↓
OpenAI GPT (com prompt otimizado)
    ↓
Output Guard (validação)
    ↓
Resposta Final
```

> 💡 O texto original é preservado para manter contexto e formatação natural na resposta

---

## 📁 Estrutura do Projeto

```
backend/
├── app/
│   ├── main.py                 # Aplicação FastAPI
│   ├── routes/                 # Endpoints da API
│   ├── services/               # Lógica de negócio
│   ├── providers/              # Componentes especializados
│   ├── policies/               # Políticas de prompt
│   └── middlewares/            # Tratamento de erros
├── .env                        # Variáveis de ambiente (não versionar!)
├── requirements.txt            # Dependências Python
├── Dockerfile                  # Container Docker
└── README.md                   # Você está aqui!
```

---

## 🛡️ Recursos de Robustez

- ✅ **Fallback Heurístico**: Sistema de backup quando IA falha
- ✅ **Output Guard**: Valida categoria, tamanho e conteúdo
- ✅ **Timeout Configurável**: Previne travamentos
- ✅ **Tratamento de Erros**: Respostas padronizadas
- ✅ **Validação de Input**: Pydantic schemas
- ✅ **Rate Limiting Ready**: Preparado para limitação de requisições

---

## 🔍 Observabilidade

### Logging Estruturado (JSON)

Todos os logs são emitidos em **formato JSON** para facilitar indexação e filtragem em ferramentas como AWS CloudWatch, ELK Stack, Datadog, etc.

#### Campos Padronizados

Cada entrada de log inclui:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `ts` | Timestamp UTC | `2026-01-15T14:30:45.123Z` |
| `level` | Nível do log | `INFO`, `ERROR`, `WARNING` |
| `logger` | Origem do log | `app.http`, `app.external_ai` |
| `msg` | Mensagem descritiva | `Request completed successfully` |
| `event` | Tipo do evento | `request_start`, `openai_rate_limit` |
| `correlation_id` | ID único da requisição | `550e8400-e29b-41d4-a716-446655440000` |

**Metadados adicionais:** `method`, `path`, `status_code`, `duration_ms`, `client_ip`

#### Exemplo de Log JSON

```json
{
  "ts": "2026-01-15T14:30:45.123Z",
  "level": "INFO",
  "logger": "app.http",
  "msg": "Request completed",
  "event": "request_end",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "path": "/emails/analyze",
  "status_code": 200,
  "duration_ms": 1250,
  "client_ip": "192.168.1.100"
}
```

### 🔗 Correlation ID (X-Correlation-Id)

Cada requisição recebe um **identificador único** para rastreamento ponta a ponta:

**Como funciona:**

1. Cliente envia header `X-Correlation-Id` → Backend reutiliza o valor
2. Sem header → Backend gera UUID automaticamente
3. Header é retornado na resposta para captura pelo cliente

**Benefícios:**

- 🔎 Rastreie todos os logs de uma requisição específica
- 🐛 Debugging facilitado em ambientes distribuídos
- 📊 Correlação entre frontend e backend
- ⚡ Diagnóstico rápido de erros em produção

**Exemplo de uso:**

```bash
# Cliente envia correlation ID
curl -X POST http://localhost:8000/emails/analyze \
  -H "X-Correlation-Id: meu-id-customizado-123" \
  -H "Content-Type: application/json" \
  -d '{"text": "teste"}'

# Response header inclui:
# X-Correlation-Id: meu-id-customizado-123
```

### 📝 Logs por Requisição

O middleware registra **dois eventos** por requisição:

#### 1. Request Start
```json
{
  "event": "request_start",
  "method": "POST",
  "path": "/emails/analyze",
  "correlation_id": "abc-123"
}
```

#### 2. Request End (com duração)
```json
{
  "event": "request_end",
  "method": "POST",
  "path": "/emails/analyze",
  "status_code": 200,
  "duration_ms": 1250,
  "correlation_id": "abc-123"
}
```

### ⚠️ Tratamento de Exceções Externas (OpenAI)

O middleware captura e registra erros do provedor de IA com logs consistentes:

**Cenários tratados:**

- 🔑 **Auth Error**: Chave de API inválida
- 🚫 **Rate Limit/Quota**: Limite de requisições/cota excedida
- ⏱️ **Timeout**: Requisição demorou demais
- ❌ **Status Errors**: Erros HTTP diversos

**Exemplo de log de erro:**

```json
{
  "ts": "2026-01-15T14:35:12.456Z",
  "level": "ERROR",
  "logger": "app.external_ai",
  "msg": "OpenAI rate limit exceeded",
  "event": "openai_rate_limit",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "status_code": 429,
  "provider_request_id": "req_abc123xyz",
  "exception": "RateLimitError: Rate limit exceeded...",
  "traceback": "..."
}
```

**Características:**

- ✅ Registra stacktrace completo
- ✅ Inclui `provider_request_id` quando disponível
- ✅ Mantém envelope padronizado na resposta
- ✅ Preserva `correlation_id` para rastreamento

### ⚙️ Configuração de Logging

Adicione ao arquivo `.env`:

```env
# Logging
LOG_LEVEL=INFO          # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_JSON=true           # true para JSON estruturado, false para texto
```

**Níveis recomendados por ambiente:**

| Ambiente | LOG_LEVEL | LOG_JSON |
|----------|-----------|----------|
| Desenvolvimento | `DEBUG` | `false` |
| Homologação | `INFO` | `true` |
| Produção | `INFO` | `true` |

### 🎯 Benefícios da Observabilidade

| Benefício | Descrição |
|-----------|-----------|
| 🔍 **Troubleshooting Rápido** | Filtre logs por `correlation_id` para ver toda a jornada da requisição |
| 📊 **Métricas de Performance** | Analise `duration_ms` para identificar gargalos |
| 🚨 **Alertas Proativos** | Configure alertas baseados em `event` e `status_code` |
| 🔗 **Rastreamento Distribuído** | Propague `correlation_id` entre microserviços |
| 🛠️ **Suporte Eficiente** | Equipe de suporte pode usar `correlation_id` do erro reportado |
| 📈 **Análise de Tendências** | Logs estruturados facilitam agregações e dashboards |

### 🔧 Exemplo de Troubleshooting

**Cenário:** Cliente reporta erro no request

1. Cliente fornece `correlation_id` do header de resposta
2. Filtre logs: `correlation_id == "550e8400-e29b-41d4-a716-446655440000"`
3. Veja toda a jornada: request_start → processamento → erro → request_end
4. Identifique stacktrace e contexto completo

**Query exemplo (CloudWatch Insights):**

```sql
fields @timestamp, level, msg, event, duration_ms
| filter correlation_id = "550e8400-e29b-41d4-a716-446655440000"
| sort @timestamp asc
```

---

## 📝 Licença

Este projeto foi desenvolvido como case para **AutoU**.

---

<div align="center">

**Desenvolvido com ❤️ usando FastAPI e OpenAI**

[Documentação](http://localhost:8000/docs) • [Reportar Bug](issues) • [Sugerir Feature](issues)

</div>
