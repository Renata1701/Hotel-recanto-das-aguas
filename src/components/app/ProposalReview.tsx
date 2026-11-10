import { Check, X } from "lucide-react";
import { Countdown, StatusPill } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { brl, type Proposal } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function ProposalReview({
  proposal,
  onConfirm,
  onRefuse,
  busy,
  className,
}: {
  proposal: Proposal;
  onConfirm: () => void;
  onRefuse: () => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{proposal.sector}</p>
          <p className="text-xs text-muted-foreground">Proposta #{proposal.id}</p>
        </div>
        <StatusPill status={proposal.status} />
      </div>
      <ul className="divide-y rounded-xl border bg-secondary/30 text-sm">
        {proposal.items.map((i) => (
          <li key={i.productId} className="flex justify-between gap-3 px-3 py-2">
            <span>
              {i.qty}× {i.name}
              {i.note && <span className="block text-xs text-muted-foreground">{i.note}</span>}
            </span>
            <span className="tabular shrink-0 font-medium">{brl(i.unitPrice * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="tabular font-display text-2xl font-semibold text-primary">{brl(proposal.total)}</span>
      </div>
      {proposal.status === "aguardando" && (
        <>
          <Countdown expiresAt={proposal.expiresAt} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" className="h-11 gap-2" onClick={onConfirm} disabled={busy}>
              <Check className="size-4" /> Confirmar
            </Button>
            <Button type="button" variant="outline" className="h-11 gap-2" onClick={onRefuse} disabled={busy}>
              <X className="size-4" /> Recusar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
