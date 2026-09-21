import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

export function TempPasswordDialog({
  open,
  email,
  password,
  onClose,
}: {
  open: boolean;
  email: string;
  password: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("password.temporary")}</DialogTitle>
          <DialogDescription>{t("password.temporaryHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("auth.email")}: </span>
            <span className="font-medium">{email}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-card px-3 py-2 font-mono text-sm tracking-wide">
              {password}
            </code>
            <Button type="button" variant="outline" size="icon" onClick={copy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
