'use client'

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  initialText: string;
  isSending?: boolean;

  onConfirm: (editedText: string) => Promise<void> | void;
};

function stripSubjectIfExists(text: string) {
  const lines = text.split("\n");
  const first = (lines[0] || "").trim();
  if (first.toLowerCase().startsWith("assunto:")) {
    return lines.slice(1).join("\n").trim();
  }
  return text.trim();
}

export function GmailSendDialog({
  open,
  onOpenChange,
  initialText,
  isSending = false,
  onConfirm,
}: Props) {
  const normalizedInitial = useMemo(() => stripSubjectIfExists(initialText), [initialText]);
  const [draft, setDraft] = useState<string>(normalizedInitial);

  useEffect(() => {
    if (open) {
      setDraft(normalizedInitial);
    }
  }, [open, normalizedInitial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar resposta antes de enviar</DialogTitle>
        </DialogHeader>

        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[220px] resize-none"
          disabled={isSending}
          placeholder="Edite a resposta aqui..."
        />

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancelar
          </Button>

          <Button
            onClick={() => onConfirm(draft)}
            disabled={isSending || !draft.trim()}
          >
            {isSending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
