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
  PanelLeft,
  PanelLeftClose,
  RotateCcw,
  ScanLine,
  UserPlus,
  Waves,
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

const STAFF_SIDEBAR_KEY = "rda-staff-sidebar-v1";
type StaffSidebarMode = "full" | "mini" | "hidden";

function readStaffSidebarMode(): StaffSidebarMode {
  if (typeof window === "undefined") return "full";
  try {
    const raw = localStorage.getItem(STAFF_SIDEBAR_KEY);
    if (raw === "mini" || raw === "hidden" || raw === "full") return raw;
  } catch {
    /* ignore */
  }
  return "full";
}

function writeStaffSidebarMode(mode: StaffSidebarMode) {
  try {
    localStorage.setItem(STAFF_SIDEBAR_KEY, mode);
  } catch {
    /* ignore */
  }
}

const staffNavIcon = (to: string) => {
  switch (to) {
    case "/inicio":
      return Home;
    case "/atendente":
      return ScanLine;
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
  const [sidebarMode, setSidebarMode] = useState<StaffSidebarMode>("full");

  useEffect(() => {
    setSidebarMode(readStaffSidebarMode());
  }, []);

  const setSidebarModePersist = (mode: StaffSidebarMode) => {
    setSidebarMode(mode);
    writeStaffSidebarMode(mode);
  };

  const sidebarHidden = sidebarMode === "hidden";
  const sidebarMini = sidebarMode === "mini";

  const logout = () => {
    clearStaffSession();
    void navigate({ to: "/login" });
  };

  const navLinkClass = cn(
    "flex items-center rounded-lg text-sm font-medium text-stone-300 transition-colors hover:bg-white/[0.07] hover:text-stone-100",
    sidebarMini ? "justify-center px-2 py-2.5 lg:px-2" : "gap-3 px-3 py-2.5",
  );

  const sidebar = (
    <>
      <div
        className={cn(
          "flex items-center border-b border-[var(--staff-sidebar-border)]",
          sidebarMini ? "justify-center px-2 py-3 lg:flex-col lg:gap-2" : "gap-2 px-3 py-3",
        )}
      >
        <Link
          to={session ? "/inicio" : "/login"}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex min-w-0 flex-1 items-center text-stone-100",
            sidebarMini ? "justify-center" : "gap-3",
          )}
          title="Recanto das Águas"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-stone-800/90 text-stone-100 shadow-soft ring-1 ring-stone-600/50">
            <Waves className="size-5" />
          </span>
          {!sidebarMini ? (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-base font-semibold tracking-tight text-stone-50">
                Recanto das Águas
              </span>
              {subtitle ? (
                <span className="block truncate text-xs text-stone-400">{subtitle}</span>
              ) : (
                <span className="block text-xs text-stone-400">Sistema da equipe</span>
              )}
            </span>
          ) : null}
        </Link>
        <div className="hidden shrink-0 lg:block">
          <button
            type="button"
            onClick={() => {
              if (sidebarMini) setSidebarModePersist("full");
              else setSidebarModePersist("mini");
            }}
            className="grid size-9 place-items-center rounded-lg text-stone-400 transition-colors hover:bg-white/[0.07] hover:text-stone-100"
            title={sidebarMini ? "Expandir menu" : "Menu só ícones"}
            aria-label={sidebarMini ? "Expandir menu" : "Recolher menu para ícones"}
          >
            <PanelLeft className={cn("size-4", sidebarMini && "opacity-80")} aria-hidden />
          </button>
        </div>
      </div>

      <nav
        className={cn("flex-1 space-y-1 overflow-y-auto py-4", sidebarMini ? "px-2" : "px-3")}
        aria-label="Menu principal"
      >
        {nav.map((n) => {
          const Icon = n.label === "Cliente" ? UserPlus : staffNavIcon(n.to);
          const search = "search" in n && n.search ? n.search : undefined;
          return (
            <Link
              key={`${n.to}-${n.label}`}
              to={n.to}
              {...(search ? { search } : {})}
              onClick={() => setMobileOpen(false)}
              title={sidebarMini ? n.label : undefined}
              className={navLinkClass}
              activeProps={{
                className: cn(
                  "bg-staff-nav-active border-l-2 border-accent font-semibold text-stone-50 shadow-sm ring-1 ring-accent/25",
                  sidebarMini && "justify-center border-l-0",
                ),
              }}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {sidebarMini ? <span className="sr-only">{n.label}</span> : n.label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-1 border-t border-[var(--staff-sidebar-border)] p-3", sidebarMini && "px-2")}>
        {session && !sidebarMini ? (
          <p className="truncate px-3 py-1.5 text-xs text-stone-500" title={session.name}>
            {session.name}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setSidebarModePersist("hidden")}
          className={cn(
            "hidden w-full items-center rounded-lg px-3 py-2 text-xs text-stone-500 transition-colors hover:bg-white/[0.07] hover:text-stone-200 lg:flex",
            sidebarMini ? "justify-center px-2" : "gap-2",
          )}
          title="Esconder menu"
        >
          <PanelLeftClose className="size-4 shrink-0" aria-hidden />
          {sidebarMini ? <span className="sr-only">Esconder menu</span> : "Esconder menu"}
        </button>
        {session ? (
          <button
            type="button"
            onClick={logout}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2.5 text-sm text-stone-300 transition-colors hover:bg-white/[0.07] hover:text-stone-50",
              sidebarMini ? "justify-center px-2" : "gap-3",
            )}
            title={sidebarMini ? "Sair" : undefined}
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            {sidebarMini ? <span className="sr-only">Sair</span> : "Sair"}
          </button>
        ) : (
          <Link
            to="/login"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-stone-200 hover:bg-white/[0.07]",
              sidebarMini ? "justify-center px-2" : "gap-3",
            )}
            title={sidebarMini ? "Entrar" : undefined}
          >
            <LogIn className="size-4 shrink-0" aria-hidden />
            {sidebarMini ? <span className="sr-only">Entrar</span> : "Entrar"}
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm("Restaurar os dados de demonstração?")) resetDemo();
          }}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2.5 text-sm text-stone-300 transition-colors hover:bg-white/[0.07] hover:text-stone-50",
            sidebarMini ? "justify-center px-2" : "gap-3",
          )}
          title={sidebarMini ? "Restaurar demonstração" : "Restaurar demonstração"}
        >
          <RotateCcw className="size-4 shrink-0" aria-hidden />
          {sidebarMini ? <span className="sr-only">Demo</span> : "Demo"}
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
          "staff-sidebar bg-staff-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-stone-800 shadow-xl transition-[transform,width] duration-300 ease-out",
          sidebarMini ? "w-[4.75rem]" : "w-[17.5rem]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          !sidebarHidden && "lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          sidebarHidden && "lg:-translate-x-full",
          !sidebarMini && !sidebarHidden && "lg:w-64",
          sidebarMini && !sidebarHidden && "lg:w-[4.75rem]",
        )}
      >
        {sidebar}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-surface">
        <div
          className={cn(
            "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/80 bg-card/90 bg-gradient-surface px-4 backdrop-blur-sm",
            !sidebarHidden && "lg:hidden",
          )}
        >
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
                setSidebarModePersist("full");
              } else {
                setMobileOpen(true);
              }
            }}
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

export function CredentialCodes({ code, compact }: { code: string; compact?: boolean | undefined }) {
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

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string | undefined }) {
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
