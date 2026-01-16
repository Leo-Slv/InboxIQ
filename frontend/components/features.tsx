"use client";

import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  BookCheck,
  ChartPie,
  FolderSync,
  Goal,
  Mail,
  Users,
  Zap,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";

type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
  preview: {
    category: "Produtivo" | "Improdutivo";
    confidence: number; // 0..1
    subject: string;
    from: string;
    excerpt: string;
    suggested: string;
  };
};

const features: Feature[] = [
  {
    icon: Goal,
    title: "Classificação Inteligente",
    description:
      "Categorize automaticamente e-mails entre produtivos e improdutivos com precisão, eliminando triagem manual e focando no que realmente importa.",
    preview: {
      category: "Produtivo",
      confidence: 0.95,
      subject: "Re: Confirmação de recebimento — Case prático (Fase 2)",
      from: "recrutamento@empresa.com",
      excerpt:
        "Após uma análise minuciosa, seu perfil foi aprovado para a próxima fase do processo seletivo...",
      suggested:
        "Olá! Obrigado pela confirmação. Confirmo que seguirei o formato solicitado e enviarei a solução dentro do prazo.",
    },
  },
  {
    icon: BookCheck,
    title: "Respostas Sugeridas",
    description:
      "Gere respostas profissionais padronizadas instantaneamente, formatadas como e-mails reais com parágrafos, espaçamento e assinatura apropriados.",
    preview: {
      category: "Produtivo",
      confidence: 0.92,
      subject: "Re: Solicitação de orçamento",
      from: "compras@cliente.com",
      excerpt:
        "Olá, vocês conseguem nos enviar uma proposta com prazo e condições de pagamento?",
      suggested:
        "Olá! Claro — segue abaixo a proposta com prazos, condições e próximos passos. Caso queira, posso agendar uma call rápida.",
    },
  },
  {
    icon: ChartPie,
    title: "Confiança do Modelo",
    description:
      "Visualize o nível de confiança de cada classificação, permitindo validação rápida e decisões informadas sobre cada mensagem processada.",
    preview: {
      category: "Improdutivo",
      confidence: 0.73,
      subject: "Newsletter semanal • novidades e ofertas",
      from: "news@servico.com",
      excerpt:
        "Veja as novidades da semana, promoções e conteúdos recomendados para você...",
      suggested:
        "Sugestão: arquivar ou marcar como baixa prioridade. Não requer resposta.",
    },
  },
  {
    icon: Users,
    title: "Interface Simplificada",
    description:
      "Experiência clara e intuitiva: faça upload de arquivos ou cole texto, visualize categoria e resposta sugerida com opção de copiar imediatamente.",
    preview: {
      category: "Produtivo",
      confidence: 0.89,
      subject: "Re: Atualização de status do projeto",
      from: "pm@empresa.com",
      excerpt:
        "Você consegue me mandar o status da entrega dessa semana e o que está bloqueando?",
      suggested:
        "Status: em andamento. Bloqueio: dependência do endpoint X. Previsão: amanhã até 17h. Próximo passo: validar payload.",
    },
  },
  {
    icon: FolderSync,
    title: "Processamento Automatizado",
    description:
      "Pipeline completo com NLP (remoção de stopwords, lematização) e IA integrada para processar alto volume de e-mails com eficiência empresarial.",
    preview: {
      category: "Produtivo",
      confidence: 0.91,
      subject: "Re: Solicitação de acesso",
      from: "ti@empresa.com",
      excerpt:
        "Precisamos liberar o acesso ao ambiente de homologação para o novo usuário...",
      suggested:
        "Confirmado. Por favor, compartilhe o e-mail e o perfil necessário para liberar o acesso em homologação.",
    },
  },
  {
    icon: Zap,
    title: "Agilidade Operacional",
    description:
      "Reduza drasticamente o tempo de resposta da equipe, liberando recursos para atividades estratégicas enquanto mantém qualidade e consistência.",
    preview: {
      category: "Produtivo",
      confidence: 0.97,
      subject: "Re: Alinhamento de entrega",
      from: "suporte@cliente.com",
      excerpt:
        "Conseguimos antecipar a entrega? Temos urgência para colocar em produção.",
      suggested:
        "Vamos conseguir antecipar. Ajustei o plano de execução e envio uma atualização hoje às 18h com status final.",
    },
  },
];

function clampPct(value: number) {
  const pct = Math.round(value * 100);
  return Math.min(100, Math.max(0, pct));
}

function MediaPreview({
  feature,
}: {
  feature: Feature;
}) {
  const [copied, setCopied] = useState(false);
  const pct = clampPct(feature.preview.confidence);

  const isProductive = feature.preview.category === "Produtivo";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feature.preview.suggested);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // silent
    }
  };

  return (
    <div
      className={cn(
        "relative w-full h-full rounded-2xl border border-border/60 bg-muted/20 overflow-hidden",
        "shadow-[0_16px_50px_-25px_rgba(0,0,0,0.6)]",
        "animate-in fade-in duration-500"
      )}
    >
      {/* Background polish */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:18px_18px] opacity-40" />
      </div>

      <div className="relative p-6 lg:p-7 space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-background/40 border border-border/50 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium">InboxIQ</p>
              <p className="text-xs text-muted-foreground">
                Preview · {feature.title}
              </p>
            </div>
          </div>

          <Badge
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              isProductive
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted text-muted-foreground border border-border"
            )}
            variant="secondary"
          >
            {feature.preview.category}
          </Badge>
        </div>

        {/* Email card */}
        <div className="rounded-2xl border border-border/60 bg-background/40 backdrop-blur-xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{feature.preview.subject}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                De: {feature.preview.from}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {pct}% confiança
              </span>
            </div>
          </div>

          <Separator className="my-4 opacity-60" />

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {feature.preview.excerpt}
          </p>

          {/* Confidence bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Precisão estimada</span>
              <span>{pct}%</span>
            </div>

            <div className="mt-2 h-2 w-full rounded-full bg-muted/60 overflow-hidden border border-border/40">
              <div
                className={cn(
                  "h-full rounded-full",
                  "bg-primary/70",
                  "transition-all duration-700 ease-out"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Suggested response card */}
        <div className="rounded-2xl border border-border/60 bg-background/30 backdrop-blur-xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Resposta sugerida</p>
              <p className="text-xs text-muted-foreground">
                Formatação de e-mail pronta para copiar
              </p>
            </div>

            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={copy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm text-foreground/90 leading-relaxed">
            <p className="line-clamp-4">{feature.preview.suggested}</p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-primary/80 animate-pulse" />
              Pipeline ativo · NLP + IA
            </div>

            <Button variant="ghost" size="sm" className="gap-2">
              Abrir análise
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Floating stack (modern UI detail) */}
        <div className="hidden lg:block">
          <div className="absolute right-6 bottom-6 w-44 space-y-2">
            <div className="rounded-xl border border-border/60 bg-background/40 p-3 shadow-sm animate-in fade-in duration-700">
              <p className="text-xs font-medium">Inbox</p>
              <p className="text-xs text-muted-foreground">
                12 novos e-mails
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/30 p-3 shadow-sm animate-in fade-in duration-700 delay-150">
              <p className="text-xs font-medium">Ações</p>
              <p className="text-xs text-muted-foreground">
                Copiar · Classificar · Responder
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Features: React.FC = () => {
  const [openValue, setOpenValue] = useState<string>("item-0");

  const activeIndex = useMemo(() => {
    const idx = Number(openValue.replace("item-", ""));
    return Number.isFinite(idx) ? idx : 0;
  }, [openValue]);

  const activeFeature = features[activeIndex] ?? features[0];

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-(--breakpoint-lg) w-full py-12 px-6">
        <h2 className="text-4xl md:text-5xl md:leading-14 font-semibold tracking-[-0.03em] max-w-lg">
          Automatize sua Caixa de Entrada com Recursos Inteligentes
        </h2>

        <div className="mt-6 md:mt-10 w-full mx-auto grid md:grid-cols-2 gap-12">
          <div className="animate-in fade-in duration-500">
            <Accordion
              value={openValue}
              onValueChange={(v) => setOpenValue(v || "item-0")}
              type="single"
              className="w-full"
            >
              {features.map(({ title, description, icon: Icon }, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="group/accordion-item data-[state=open]:border-b-2 data-[state=open]:border-primary"
                >
                  <AccordionTrigger className="text-lg [&>svg]:hidden group-first/accordion-item:pt-0">
                    <div className="flex items-center gap-4">
                      <Icon className="h-5 w-5 text-primary" />
                      {title}
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="text-[17px] leading-relaxed text-muted-foreground">
                    {description}
                    <div className="mt-6 mb-2 md:hidden aspect-video w-full bg-muted rounded-xl" />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* ✅ Media Moderna (React Component + Fade) */}
          <div className="hidden md:block">
            {/* key força re-mount e ativa o fade sempre que trocar o item */}
            <div key={openValue} className="h-full animate-in fade-in duration-500">
              <MediaPreview feature={activeFeature} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;
