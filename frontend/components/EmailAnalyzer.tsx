'use client'
import React, { useState, useRef, useEffect } from "react";
import { Upload, Send, FileText, X, Loader2, Mail, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type EmailCategory = "Produtivo" | "Improdutivo" | "Neutro";

interface EmailAnalyzeResponse {
  category: EmailCategory;
  confidence: number; // 0..1
  suggestedResponse: string;
}

const EmailAnalyzer: React.FC = () => {
  const [emailText, setEmailText] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<EmailAnalyzeResponse | null>(null);
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Efeito de digitação
  useEffect(() => {
    if (!response || !isTyping) return;

    let index = 0;
    const text = response.suggestedResponse ?? "";
    setDisplayedText("");

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text[index]);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [response, isTyping]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const fileType = uploadedFile.name.split(".").pop()?.toLowerCase();

    if (fileType === "pdf" || fileType === "txt") {
      setFile(uploadedFile);
      return;
    }

    alert("Por favor, envie apenas arquivos .pdf ou .txt");

    // opcional: limpar input se for inválido
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!emailText.trim() && !file) return;

    setIsLoading(true);
    setResponse(null);
    setDisplayedText("");

    try {
      // Simulação de chamada ao backend
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockResponse: EmailAnalyzeResponse = {
        category: "Produtivo",
        confidence: 0.95,
        suggestedResponse:
          `Assunto: Re: Confirmação de recebimento — Case prático (Fase 2)\n\n` +
          `Olá Leonardo,\n\n` +
          `Obrigado pela confirmação!\n\n` +
          `Recebi seu e-mail e as instruções do case. Confirmo que seguirei o formato solicitado e enviarei a solução dentro do prazo estabelecido (até sábado, 17/01/2026, às 23:59).\n\n` +
          `Caso surja alguma dúvida durante a execução, entrarei em contato.\n\n` +
          `Atenciosamente,\n` +
          `[Seu Nome]`,
      };

      setResponse(mockResponse);
      setIsTyping(true);
    } catch (error) {
      console.error("Erro ao processar:", error);
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

  const copyToClipboard = async () => {
    if (!response?.suggestedResponse) return;

    try {
      await navigator.clipboard.writeText(response.suggestedResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  };

  const formatTextWithLineBreaks = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
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
                onChange={(e) => setEmailText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cole o conteúdo do e-mail aqui..."
                className="min-h-[120px] resize-none"
                disabled={isLoading}
              />
            </div>

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
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Anexar arquivo
                </Button>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={(!emailText.trim() && !file) || isLoading}
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

        {/* Response Card */}
        {response && (
          <Card className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="bg-muted/30">
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
            </CardHeader>

            <Separator />

            <CardContent className="pt-6">
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {isTyping
                  ? formatTextWithLineBreaks(displayedText)
                  : formatTextWithLineBreaks(response.suggestedResponse)}
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
