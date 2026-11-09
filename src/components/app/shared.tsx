import { Link, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { LogIn, LogOut, RotateCcw, Waves } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  guestAccessUrl,
  isLocalDevHost,
  normalizeCredentialCode,
  normalizeQrOrigin,
  resolveGuestQrOrigin,
  setStoredQrOrigin,
} from "@/lib/guest-access-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROPOSAL_TTL_MS, type ProposalStatus } from "@/lib/domain";
import { clearStaffSession, staffNavForRole, useStaffSession } from "@/lib/auth";
import { resetDemo, useNow } from "@/lib/store";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const session = useStaffSession();
  const nav = useMemo(() => staffNavForRole(session?.role), [session?.role]);
  const navigate = useNavigate();

  const logout = () => {
    clearStaffSession();
    void navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to={session ? "/inicio" : "/login"} className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-brand-gradient text-primary-foreground shadow-soft">
            <Waves className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tracking-tight">Recanto das Águas</span>
            {subtitle && <span className="block text-xs text-muted-foreground">{subtitle}</span>}
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-primary/10 font-semibold text-primary" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {session ? (
            <>
              <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:inline" title={session.name}>
                {session.name}
              </span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="size-3.5" /> Sair
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-primary hover:bg-primary/10"
            >
              <LogIn className="size-3.5" /> Entrar
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              if (confirm("Restaurar os dados de demonstração?")) resetDemo();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-secondary"
            title="Restaurar demonstração"
          >
            <RotateCcw className="size-3.5" /> Demo
          </button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2 md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted-foreground" activeProps={{ className: "bg-primary/10 font-semibold text-primary" }}>
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
  const credential = normalizeCredentialCode(code);
  const [qrOrigin, setQrOrigin] = useState<string | null>(null);
  const [originDraft, setOriginDraft] = useState("");
  const [showOriginHelp, setShowOriginHelp] = useState(false);

  const scanUrl = guestAccessUrl(credential, qrOrigin);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const origin = await resolveGuestQrOrigin();
      if (cancelled) return;
      setQrOrigin(origin);
      if (!origin && typeof window !== "undefined" && isLocalDevHost(window.location.hostname)) {
        setShowOriginHelp(true);
        const port = window.location.port ? `:${window.location.port}` : "";
        setOriginDraft(`http://192.168.0.0${port}`);
      }
    };
    void load();

    const onOrigin = () => void load();
    window.addEventListener("rda-qr-origin", onOrigin);
    return () => {
      cancelled = true;
      window.removeEventListener("rda-qr-origin", onOrigin);
    };
  }, []);

  const applyOrigin = () => {
    const next = setStoredQrOrigin(originDraft);
    if (!next) return;
    setQrOrigin(next);
    setShowOriginHelp(false);
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-4">
      {showOriginHelp && (
        <div className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-left text-xs text-foreground">
          <p className="font-semibold">Celular não abre localhost</p>
          <p className="mt-1 text-muted-foreground">
            Use o IP do PC na mesma rede Wi‑Fi (ex.: <span className="font-mono">http://192.168.1.10:8080</span>). Abra
            esse endereço no celular uma vez para testar.
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              value={originDraft}
              onChange={(e) => setOriginDraft(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="http://192.168.1.10:8080"
              aria-label="Endereço do app no celular"
            />
            <Button type="button" size="sm" className="shrink-0" onClick={applyOrigin}>
              Aplicar
            </Button>
          </div>
        </div>
      )}
      {scanUrl ? (
        <>
          <QRCodeSVG value={scanUrl} size={compact ? 120 : 180} level="M" includeMargin />
          <p className="max-w-full break-all text-center text-[10px] leading-snug text-muted-foreground">{scanUrl}</p>
        </>
      ) : (
        <p className="py-6 text-center text-xs text-muted-foreground">Defina o endereço acima para gerar o QR do celular.</p>
      )}
      <p className="text-center text-xs text-muted-foreground">No celular: câmera abre ativação ou entrada do hóspede.</p>
      {!showOriginHelp && qrOrigin && typeof window !== "undefined" && isLocalDevHost(window.location.hostname) && (
        <button
          type="button"
          className="text-[10px] text-primary hover:underline"
          onClick={() => {
            setOriginDraft(qrOrigin);
            setShowOriginHelp(true);
          }}
        >
          Alterar endereço do QR ({normalizeQrOrigin(qrOrigin) ?? qrOrigin})
        </button>
      )}
      <Barcode value={credential} format="CODE128" height={compact ? 40 : 56} width={1.4} fontSize={12} margin={0} background="transparent" />
      <p className="text-center text-[10px] text-muted-foreground">Código de barras para leitor do atendente / terminal.</p>
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
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const fmtTime = (t: number) =>
  new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
