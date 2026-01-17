'use client'
import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gmailListInbox, GmailMessageListItem } from "@/lib/gmail/gmailClient";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (email: GmailMessageListItem) => void;
};

export function GmailPickerDialog({ open, onOpenChange, onSelect }: Props) {
  const [items, setItems] = useState<GmailMessageListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) || null,
    [items, selectedId]
  );

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        setLoading(true);
        setSelectedId(null);

        const list = await gmailListInbox(12);
        setItems(list);
      } catch (e: any) {
        toast.error("Falha ao carregar e-mails", {
          description: e?.message || "Não foi possível listar emails do Gmail.",
        });
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const handleConfirm = () => {
    if (!selected) {
      toast.error("Selecione um email", {
        description: "Escolha um email na lista para continuar.",
      });
      return;
    }
    onSelect(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar e-mail do Gmail</DialogTitle>
          <DialogDescription>
            Escolha um e-mail para analisar e responder diretamente no mesmo thread.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-2 max-h-[340px] overflow-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando e-mails...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum email encontrado.
            </div>
          )}

          {!loading &&
            items.map((email) => {
              const active = email.id === selectedId;

              return (
                <Button
                  key={email.id}
                  variant="secondary"
                  onClick={() => setSelectedId(email.id)}
                  className={`w-full justify-start h-auto py-3 px-4 whitespace-normal ${active ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex flex-col items-start gap-1 w-full text-left">
                    <div className="flex items-center justify-between w-full gap-3">
                      <span className="font-medium truncate">
                        {email.subject || "(Sem assunto)"}
                      </span>

                      {active ? (
                        <Badge className="shrink-0">Selecionado</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          Selecionar
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground truncate w-full">
                      {email.from || "Remetente desconhecido"}
                    </div>

                    {email.snippet && (
                      <div className="text-xs text-muted-foreground line-clamp-2 w-full">
                        {email.snippet}
                      </div>
                    )}
                  </div>
                </Button>
              );
            })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selected}>
            Confirmar seleção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
