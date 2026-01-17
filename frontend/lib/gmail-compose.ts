export function openGmailComposeFromSuggestedReply(suggestedResponse: string) {
  const text = (suggestedResponse || "").trim();
  if (!text) return;

  // Esperado: primeira linha "Assunto: Re: ...."
  const lines = text.split("\n");
  const firstLine = (lines[0] || "").trim();

  const subject = firstLine.toLowerCase().startsWith("assunto:")
    ? firstLine.slice("assunto:".length).trim()
    : "Resposta sugerida";

  // Remove a linha do assunto do corpo
  const bodyLines = firstLine.toLowerCase().startsWith("assunto:")
    ? lines.slice(1)
    : lines;

  const body = bodyLines.join("\n").trim();

  // Gmail web compose (não exige OAuth)
  const url =
    "https://mail.google.com/mail/?view=cm&fs=1&tf=1" +
    `&su=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}
