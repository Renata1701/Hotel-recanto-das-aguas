import { Link, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import {
  ConciergeBell,
  Home,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  RotateCcw,
  ScanLine,
  Smartphone,
} from "lucide-react";
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
import { BrandMark } from "@/components/app/BrandMark";

const staffNavIcon = (to: string) => {
  switch (to) {
    case "/inicio":
      return Home;
    case "/atendente":
      return ScanLine;
    case "/cliente/entrar":
      return Smartphone;
    case "/terminal":
      return Monitor;
    case "/recepcao":
      return ConciergeBell;
    default:
      return Home;
  }
};

/** Layout da equipe: logo, navegação, usuário e ações no menu lateral. */
export function StaffLayout({
  subtitle,
  children,
  /** Conteúdo ocupa só a altura da tela, sem scroll da página (ex.: atendente). */
  fillViewport,
}: {
  subtitle?: string;
  children: ReactNode;
  fillViewport?: boolean;
}) {
  const session = useStaffSession();
  const nav = useMemo(() => staffNavForRole(session?.role), [session?.role]);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = () => {
    clearStaffSession();
    void navigate({ to: "/login" });
  };

  const sidebar = (
    <>
      <Link
        to={session ? "/inicio" : "/login"}
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-3 border-b border-white/15 px-4 py-4"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white p-1 shadow-soft ring-1 ring-white/30">
          <BrandMark size={40} alt="" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-base font-semibold tracking-tight text-white">Recanto das Águas</span>
          {subtitle ? (
            <span className="block truncate text-xs text-white/75">{subtitle}</span>
          ) : (
            <span className="block text-xs text-white/75">Sistema da equipe</span>
          )}
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Menu principal">
        {nav.map((n) => {
          const Icon = staffNavIcon(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              activeProps={{
                className: "bg-nav-active-gradient font-semibold text-white shadow-md ring-1 ring-white/25",
              }}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/15 p-3">
        {session ? (
          <p className="truncate px-3 py-1.5 text-xs text-white/70" title={session.name}>
            {session.name}
          </p>
        ) : null}
        {session ? (
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4 shrink-0" /> Sair
          </button>
        ) : (
          <Link
            to="/login"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10"
          >
            <LogIn className="size-4 shrink-0" /> Entrar
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm("Restaurar os dados de demonstração?")) resetDemo();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          title="Restaurar demonstração"
        >
          <RotateCcw className="size-4 shrink-0" /> Demo
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden lg:flex">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-white/10 bg-brand-gradient text-primary-foreground shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebar}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-surface">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/80 bg-card/90 bg-gradient-surface px-4 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid size-10 place-items-center rounded-lg border border-border text-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="truncate font-semibold">Recanto das Águas</span>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1",
            fillViewport ? "flex flex-col overflow-hidden" : "overflow-y-auto",
          )}
        >
          {children}
        </div>
      </div>
    </div>
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
    <section className={cn("rounded-2xl border border-border/90 bg-card shadow-soft", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border/80 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
