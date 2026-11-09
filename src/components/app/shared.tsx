import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { Waves, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PROPOSAL_TTL_MS, type ProposalStatus } from "@/lib/domain";
import { resetDemo, useNow } from "@/lib/store";

const nav = [
  { to: "/atendente", label: "Atendente" },
  { to: "/cliente", label: "Cliente" },
  { to: "/terminal", label: "Terminal" },
  { to: "/recepcao", label: "Recepção" },
] as const;

export function AppHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-lagoon-gradient text-primary-foreground shadow-soft">
            <Waves className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold">Recanto das Águas</span>
            {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            if (confirm("Restaurar os dados de demonstração?")) resetDemo();
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-secondary md:ml-0"
          title="Restaurar demonstração"
        >
          <RotateCcw className="size-3.5" /> Demo
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2 md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted-foreground" activeProps={{ className: "bg-secondary text-foreground" }}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

const statusStyles: Record<ProposalStatus, { label: string; cls: string }> = {
  aguardando: { label: "Aguardando confirmação", cls: "bg-warning/25 text-warning-foreground" },
  confirmada: { label: "Confirmada", cls: "bg-success/15 text-success" },
  recusada: { label: "Recusada", cls: "bg-destructive/12 text-destructive" },
  expirada: { label: "Expirada", cls: "bg-muted text-muted-foreground" },
  cancelada: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
};

export function StatusPill({ status, className }: { status: ProposalStatus; className?: string }) {
  const s = statusStyles[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", s.cls, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

export function Countdown({ expiresAt }: { expiresAt: number }) {
  const now = useNow(500);
  const left = Math.max(0, expiresAt - now);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const pct = (left / PROPOSAL_TTL_MS) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Validade</span>
        <span className="tabular font-mono font-semibold text-foreground">
          {m}:{String(s).padStart(2, "0")}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", pct < 25 ? "bg-destructive" : "bg-accent")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CredentialCodes({ code, compact }: { code: string; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-4">
      <QRCodeSVG value={code} size={compact ? 120 : 180} level="M" />
      <Barcode value={code} format="CODE128" height={compact ? 40 : 56} width={1.4} fontSize={12} margin={0} background="transparent" />
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card shadow-soft", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <h2 className="font-sans text-sm font-semibold tracking-normal">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const fmtTime = (t: number) =>
  new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
