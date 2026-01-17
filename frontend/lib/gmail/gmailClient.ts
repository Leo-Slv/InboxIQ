// src/lib/gmail/gmailClient.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

export type GmailMessageListItem = {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  messageIdHeader?: string; // "Message-ID" do email original (para reply real)
};

type GmailApiMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: any;
};

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

let accessToken: string | null = null;

function requireGoogleClientId(): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurado.");
  return clientId;
}

/**
 * OAuth client-side (token access) com Google Identity Services.
 * Escopos mínimos para case:
 * - gmail.readonly: listar/ler emails
 * - gmail.send: responder
 */
export async function gmailConnect(): Promise<string> {
  if (accessToken) return accessToken;

  const clientId = requireGoogleClientId();

  // Carrega o script do GIS caso ainda não esteja no DOM
  await loadGoogleIdentityScript();

  return await new Promise((resolve, reject) => {
    const googleAny = (window as any).google;
    if (!googleAny?.accounts?.oauth2) {
      reject(new Error("Google Identity Services não está disponível."));
      return;
    }

    const tokenClient = googleAny.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
      prompt: "consent",
      callback: (resp: any) => {
        if (resp?.access_token) {
          accessToken = resp.access_token;
          resolve(resp.access_token);
          return;
        }
        reject(new Error("Falha ao obter access_token do Google."));
      },
      error_callback: (err: any) => {
        reject(new Error(err?.message || "Erro OAuth Google."));
      },
    });

    tokenClient.requestAccessToken();
  });
}

export function gmailDisconnect() {
  accessToken = null;
}

async function loadGoogleIdentityScript(): Promise<void> {
  const alreadyLoaded = document.querySelector('script[data-google-identity="true"]');
  if (alreadyLoaded) return;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Google Identity script."));
    document.head.appendChild(script);
  });
}

function authHeaders() {
  if (!accessToken) throw new Error("Não autenticado no Gmail.");
  return { Authorization: `Bearer ${accessToken}` };
}

function getHeader(headers: any[] | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const h = headers.find((x) => String(x.name).toLowerCase() === name.toLowerCase());
  return h?.value;
}

export async function gmailListInbox(maxResults = 10): Promise<GmailMessageListItem[]> {
  await gmailConnect();

  const listUrl = `${GMAIL_API}/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent("in:inbox")}`;
  const listRes = await fetch(listUrl, { headers: authHeaders() });
  if (!listRes.ok) throw new Error("Falha ao listar e-mails do Gmail.");

  const listJson = await listRes.json();
  const ids: { id: string; threadId: string }[] = listJson.messages || [];

  // Busca metadata de cada mensagem (Subject, From, Message-ID)
  const items = await Promise.all(
    ids.map(async (m) => {
      const metaUrl =
        `${GMAIL_API}/users/me/messages/${m.id}` +
        `?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Message-ID`;

      const r = await fetch(metaUrl, { headers: authHeaders() });
      if (!r.ok) throw new Error("Falha ao buscar metadados do email.");

      const j = (await r.json()) as GmailApiMessage;

      const headers = j.payload?.headers as any[] | undefined;
      const subject = getHeader(headers, "Subject");
      const from = getHeader(headers, "From");
      const msgId = getHeader(headers, "Message-ID");

      return {
        id: j.id,
        threadId: j.threadId,
        snippet: j.snippet,
        subject,
        from,
        messageIdHeader: msgId,
      } satisfies GmailMessageListItem;
    })
  );

  return items;
}

/**
 * Extrai texto "text/plain" preferencialmente.
 * Se não existir, tenta pegar "text/html" e devolver como string (sem sanitização).
 */
export async function gmailGetMessageText(messageId: string): Promise<string> {
  await gmailConnect();

  const url = `${GMAIL_API}/users/me/messages/${messageId}?format=full`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error("Falha ao ler conteúdo do email.");

  const msg = (await res.json()) as GmailApiMessage;

  const payload = msg.payload;
  if (!payload) return msg.snippet || "";

  const plain = findBodyPart(payload, "text/plain");
  if (plain) return decodeBase64Url(plain);

  const html = findBodyPart(payload, "text/html");
  if (html) return decodeBase64Url(html);

  return msg.snippet || "";
}

function findBodyPart(payload: any, mimeType: string): string | null {
  // payload.body.data pode existir
  if (payload?.mimeType === mimeType && payload?.body?.data) {
    return payload.body.data;
  }

  // parts
  const parts: any[] = payload?.parts || [];
  for (const p of parts) {
    const found = findBodyPart(p, mimeType);
    if (found) return found;
  }

  return null;
}

function decodeBase64Url(data: string): string {
  // base64url -> base64
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
  const decoded = atob(padded);

  // UTF-8 decode
  try {
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return decoded;
  }
}

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function extractEmailAddress(fromHeader?: string): string | null {
  if (!fromHeader) return null;
  // "Name <email@domain.com>"
  const match = fromHeader.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim();
  // fallback: tenta usar como email direto
  if (fromHeader.includes("@")) return fromHeader.trim();
  return null;
}

/**
 * Envia um REPLY no mesmo thread (não é novo e-mail).
 * Precisa:
 * - threadId
 * - To (remetente original)
 * - Subject (Re: ...)
 * - Message-ID original (In-Reply-To / References)
 * - body
 */
export async function gmailSendReply(params: {
  threadId: string;
  fromHeader?: string;
  subject?: string;
  messageIdHeader?: string;
  body: string;
}) {
  await gmailConnect();

  const to = extractEmailAddress(params.fromHeader);
  if (!to) throw new Error("Não foi possível extrair destinatário (From) do email.");

  const subject = params.subject?.toLowerCase().startsWith("re:")
    ? params.subject
    : `Re: ${params.subject || "Resposta"}`;

  const headers: string[] = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
  ];

  if (params.messageIdHeader) {
    headers.push(`In-Reply-To: ${params.messageIdHeader}`);
    headers.push(`References: ${params.messageIdHeader}`);
  }

  const raw = `${headers.join("\r\n")}\r\n\r\n${params.body}`;
  const rawB64Url = base64UrlEncode(raw);

  const sendUrl = `${GMAIL_API}/users/me/messages/send`;
  const res = await fetch(sendUrl, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      threadId: params.threadId,
      raw: rawB64Url,
    }),
  });

  if (!res.ok) {
    throw new Error("Falha ao enviar reply pelo Gmail.");
  }
}
