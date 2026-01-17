'use client'
import React, { useState, useRef, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { Upload, Send, FileText, X, Loader2, Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { GmailSendDialog } from "./GmailSendDialog";

import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { openGmailComposeFromSuggestedReply } from "@/lib/gmail-compose";
import {
  gmailConnect,
  gmailGetMessageText,
  gmailSendReply,
  GmailMessageListItem,
} from "@/lib/gmail/gmailClient";
import { GmailIcon } from "./GmailIcon";
import { GmailPickerDialog } from "./GmailPickerDialog";

type EmailCategory = "Produtivo" | "Improdutivo" | "Neutro";

interface EmailAnalyzeResponse {
  category: EmailCategory;
  confidence: number; // 0..1
  suggestedResponse: string;
}

interface ApiError {
  code: string;
  message: string;
  field?: string | null;
}

interface ApiResponse<T> {
  message: string;
  success: boolean;
  data: T | null;
  errors: ApiError[] | null;
}

interface EmailAnalyzeApiData {
  category: EmailCategory;
  confidence: number;
  suggested_reply: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
});

const EmailAnalyzer: React.FC = () => {
  const [emailText, setEmailText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const [gmailDialogOpen, setGmailDialogOpen] = useState(false);
  const [selectedGmailEmail, setSelectedGmailEmail] = useState<GmailMessageListItem | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<EmailAnalyzeResponse | null>(null);
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendDraft, setSendDraft] = useState<string>("");
  const [isSendingGmail, setIsSendingGmail] = useState(false);


  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isGmailMode = !!selectedGmailEmail;

  // ✅ Efeito de digitação
  useEffect(() => {
    if (!response || !isTyping) return;

    const text = response.suggestedResponse ?? "";
    const chars = Array.from(text);

    let index = 0;
    setDisplayedText("");

    const interval = setInterval(() => {
      if (index < chars.length) {
        setDisplayedText((prev) => prev + chars[index]);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [response, isTyping]);

  const typingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!response || !isTyping) return;

    // ✅ limpa qualquer interval antigo antes de iniciar um novo
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    const raw = response.suggestedResponse ?? "";

    // ✅ garante forma consistente de acentos/unicode
    const text = raw.normalize("NFC");

    // ✅ evita bug de unicode (acentos, travessão, etc.)
    const chars = Array.from(text);

    let index = 0;

    // ✅ começa vazio
    setDisplayedText("");

    typingIntervalRef.current = window.setInterval(() => {
      index++;

      if (index <= chars.length) {
        // ✅ determinístico: sempre pega do 0 até index
        setDisplayedText(chars.slice(0, index).join(""));
        return;
      }

      // fim
      setIsTyping(false);

      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    }, 18);

    // ✅ cleanup sempre
    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [response?.suggestedResponse, isTyping]);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGmailMode) {
      toast.error("Ação indisponível", {
        description: "Remova o e-mail selecionado do Gmail para anexar um arquivo.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const fileType = uploadedFile.name.split(".").pop()?.toLowerCase();

    if (fileType === "pdf" || fileType === "txt") {
      setFile(uploadedFile);
      setEmailText("");
      return;
    }

    toast.error("Arquivo inválido", {
      description: "Por favor, envie apenas arquivos .pdf ou .txt",
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearGmailSelection = () => {
    setSelectedGmailEmail(null);
  };

  const openGmailPicker = async () => {
    try {
      await gmailConnect();
      setGmailDialogOpen(true);
    } catch (e: any) {
      toast.error("Falha ao conectar Gmail", {
        description: e?.message || "Não foi possível autenticar no Gmail.",
      });
    }
  };

  const handleSubmit = async () => {
    if (!API_URL) {
      toast.error("Configuração ausente", {
        description: "NEXT_PUBLIC_API_URL não configurada. Verifique seu .env.local",
      });
      return;
    }

    // ✅ Prioridade: se selecionou Gmail, analisa ele
    if (selectedGmailEmail) {
      setIsLoading(true);
      setResponse(null);
      setDisplayedText("");
      setIsTyping(false);

      try {
        const emailBodyText = await gmailGetMessageText(selectedGmailEmail.id);

        const { data } = await api.post<ApiResponse<EmailAnalyzeApiData>>("/emails/analyze", {
          text: emailBodyText,
        });

        if (!data.success || !data.data) {
          toast.error("Falha na análise", {
            description: data.message || "Falha ao analisar o e-mail.",
          });
          return;
        }

        const mapped: EmailAnalyzeResponse = {
          category: data.data.category,
          confidence: data.data.confidence,
          suggestedResponse: data.data.suggested_reply,
        };

        setResponse(mapped);
        setIsTyping(true);

        toast.success("Análise concluída", {
          description: "Resposta sugerida gerada com sucesso.",
        });
      } catch (error) {
        const err = error as AxiosError<ApiResponse<unknown>>;
        const apiMessage =
          err.response?.data?.message ||
          (typeof err.message === "string" ? err.message : "Erro ao processar.");

        toast.error("Erro ao processar", { description: apiMessage });
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // ✅ Fluxo atual: texto OU arquivo
    const hasText = !!emailText.trim();
    const hasFile = !!file;

    if (!hasText && !hasFile) return;

    if (hasFile && hasText) {
      toast.error("Envio inválido", {
        description:
          "Remova o arquivo anexado para enviar texto, ou deixe o texto vazio para analisar o arquivo.",
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setDisplayedText("");
    setIsTyping(false);

    try {
      let res: ApiResponse<EmailAnalyzeApiData>;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await api.post<ApiResponse<EmailAnalyzeApiData>>(
          "/emails/analyze-file",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        res = data;
      } else {
        const { data } = await api.post<ApiResponse<EmailAnalyzeApiData>>("/emails/analyze", {
          text: emailText,
        });
        res = data;
      }

      if (!res.success || !res.data) {
        toast.error("Falha na análise", {
          description: res.message || "Falha ao analisar o e-mail.",
        });
        return;
      }

      const mapped: EmailAnalyzeResponse = {
        category: res.data.category,
        confidence: res.data.confidence,
        suggestedResponse: res.data.suggested_reply,
      };

      setResponse(mapped);
      setIsTyping(true);

      toast.success("Análise concluída", {
        description: "Resposta sugerida gerada com sucesso.",
      });
    } catch (error) {
      const err = error as AxiosError<ApiResponse<unknown>>;
      const apiMessage =
        err.response?.data?.message ||
        (typeof err.message === "string" ? err.message : "Erro ao processar.");

      toast.error("Erro ao processar", { description: apiMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleGmailIntegration = async () => {
    if (!response?.suggestedResponse) return;

    // ✅ Se tem email selecionado no Gmail -> abre modal de edição antes de enviar
    if (selectedGmailEmail) {
      setSendDraft(response.suggestedResponse);
      setSendDialogOpen(true);
      return;
    }

    // ✅ texto/pdf -> mantém comportamento atual (abre composer)
    try {
      openGmailComposeFromSuggestedReply(response.suggestedResponse);
      toast("Abrindo Gmail", {
        description: "A resposta foi inserida no editor do Gmail.",
      });
    } catch {
      toast.error("Falha ao abrir Gmail", {
        description: "Não foi possível iniciar o composer do Gmail.",
      });
    }
  };

  const confirmSendGmailReply = async (editedText: string) => {
    if (!selectedGmailEmail) return;

    try {
      setIsSendingGmail(true);

      await gmailSendReply({
        threadId: selectedGmailEmail.threadId,
        fromHeader: selectedGmailEmail.from,
        subject: selectedGmailEmail.subject,
        messageIdHeader: selectedGmailEmail.messageIdHeader,
        body: editedText.trim(),
      });

      setSendDialogOpen(false);

      toast.success("Resposta enviada", {
        description: "A resposta foi enviada no mesmo e-mail/thread.",
      });
    } catch (e: any) {
      toast.error("Falha ao responder", {
        description: e?.message || "Não foi possível enviar a resposta via Gmail.",
      });
    } finally {
      setIsSendingGmail(false);
    }
  };



  const copyToClipboard = async () => {
    if (!response?.suggestedResponse) return;

    try {
      await navigator.clipboard.writeText(response.suggestedResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast("Copiado", {
        description: "A resposta foi copiada para a área de transferência.",
      });
    } catch {
      toast.error("Falha ao copiar", {
        description: "Não foi possível copiar o texto.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3" id="get-started">
          <div className="flex items-center justify-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">InboxIQ</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Cole seu e-mail ou envie um arquivo (.txt ou .pdf) para análise inteligente
          </p>
        </div>

        {/* Input Card */}
        <Card className="shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Textarea
                value={emailText}
                onChange={(e) => {
                  if (isGmailMode) {
                    toast.error("Texto desabilitado", {
                      description: "Remova o e-mail selecionado do Gmail para digitar texto.",
                    });
                    return;
                  }
                  if (file) {
                    toast.error("Texto desabilitado", {
                      description: "Remova o arquivo anexado para digitar texto.",
                    });
                    return;
                  }
                  setEmailText(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Cole o conteúdo do e-mail aqui..."
                className="min-h-[120px] resize-none"
                disabled={isLoading || !!file || isGmailMode}
              />
            </div>

            {/* Gmail selecionado */}
            {selectedGmailEmail && (
              <Alert className="bg-muted border-border">
                <div className="flex items-center gap-3">
                  <GmailIcon size={18} />
                  <AlertDescription className="flex-1 truncate font-medium">
                    {selectedGmailEmail.subject || "(Sem assunto)"}
                  </AlertDescription>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearGmailSelection}
                    disabled={isLoading}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Alert>
            )}

            {/* File Upload */}
            {file && (
              <Alert className="bg-muted border-border">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <AlertDescription className="flex-1 truncate font-medium">
                    {file.name}
                  </AlertDescription>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    disabled={isLoading}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isLoading || isGmailMode}
                />

                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isGmailMode}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden md:inline">Anexar arquivo</span>
                </Button>


                {/* ✅ Botão Gmail ao lado */}
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (file || emailText.trim()) {
                      toast.error("Ação indisponível", {
                        description: "Limpe o texto/anexo para selecionar um e-mail do Gmail.",
                      });
                      return;
                    }
                    openGmailPicker();
                  }}
                  disabled={isLoading || !!file || !!emailText.trim()}
                  className="gap-2"
                  title="Selecionar e-mail do Gmail"
                >
                  <GmailIcon size={16} />
                  Gmail
                </Button>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={
                  isLoading ||
                  (!selectedGmailEmail && !emailText.trim() && !file) ||
                  (!!selectedGmailEmail && (!!emailText.trim() || !!file))
                }

                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Analisar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Dialog de seleção Gmail */}
        <GmailPickerDialog
          open={gmailDialogOpen}
          onOpenChange={setGmailDialogOpen}
          onSelect={(email) => {
            setSelectedGmailEmail(email);
            setEmailText("");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";

            toast.success("E-mail selecionado", {
              description: "Agora você pode analisar e responder diretamente no Gmail.",
            });
          }}
        />

        <GmailSendDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          initialText={sendDraft}
          isSending={isSendingGmail}
          onConfirm={confirmSendGmailReply}
        />


        {/* Response Card */}
        {response && (
          <Card className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">
                      Categoria:
                    </span>
                    <Badge
                      variant={response.category === "Produtivo" ? "default" : "secondary"}
                      className={cn(
                        response.category === "Produtivo" &&
                        "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      {response.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({(response.confidence * 100).toFixed(0)}% confiança)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* ✅ mesmo botão, 2 comportamentos */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGmailIntegration}
                    className="gap-1.5"
                    title={selectedGmailEmail ? "Enviar resposta via Gmail" : "Abrir no Gmail"}
                    disabled={!response?.suggestedResponse}
                  >
                    <GmailIcon size={16} />
                    Enviar
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={copyToClipboard}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6">
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {isTyping ? displayedText : response.suggestedResponse}
                {isTyping && (
                  <span className="inline-block w-1 h-4 bg-primary ml-0.5 animate-pulse" />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        {!response && !isLoading && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Pressione{" "}
              <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono border border-border">
                Enter
              </kbd>{" "}
              para analisar ou{" "}
              <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono border border-border">
                Shift + Enter
              </kbd>{" "}
              para nova linha
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailAnalyzer;
