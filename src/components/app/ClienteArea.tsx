import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, ChevronRight, LogOut, Smartphone, UserPlus, Waves } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CredentialCodes, EmptyState, Panel, StatusPill, fmtTime } from "@/components/app/shared";
import { FICTIONAL_DEMO_GUEST } from "@/lib/demo-client";
import { ProposalReview } from "@/components/app/ProposalReview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activateCredential,
  balance,
  brl,
  DomainError,
  findParticipant,
  findStay,
  loginCredential,
  registerFictionalGuest,
  resolveProposal,
  type Credential,
  type Entry,
  type Payment,
  type Proposal,
  type State,
} from "@/lib/domain";
import {
  clearGuestSession,
  clearPinFailures,
  getPinLock,
  guestSessionFromCredential,
  recordPinFailure,
  setGuestSession,
  type GuestSession,
} from "@/lib/client-session";
import { commit, getState } from "@/lib/store";
import { cn } from "@/lib/utils";
import hero from "@/assets/hero-pool.jpg";

const guestCredentialPattern = /^RDA-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const GUEST_LIST_PAGE_SIZE = 4;

function GuestListPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= GUEST_LIST_PAGE_SIZE) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-center text-xs text-muted-foreground sm:text-left">
        {total} {total === 1 ? "item" : "itens"} · página {page} de {totalPages}
      </p>
      <div className="flex justify-center gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2.5"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2.5"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function usePagedList<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages, items.length]);

  const slice = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return { slice, page: safePage, setPage, totalPages, total: items.length };
}

function GuestPagedPanel<T>({
  title,
  items,
  empty,
  renderList,
}: {
  title: string;
  items: T[];
  empty: ReactNode;
  renderList: (slice: T[]) => ReactNode;
}) {
  const { slice, page, setPage, totalPages, total } = usePagedList(items, GUEST_LIST_PAGE_SIZE);

  return (
    <Panel title={title}>
      {items.length === 0 ? (
        empty
      ) : (
        <>
          {renderList(slice)}
          <GuestListPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </Panel>
  );
}

export function ClientGuestShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="login-resort flex h-dvh max-h-dvh flex-col overflow-hidden lg:flex-row">
      <aside className="relative hidden min-h-0 flex-1 overflow-hidden lg:flex lg:min-w-0 lg:max-w-[58%]">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="login-resort-hero-overlay absolute inset-0" aria-hidden />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3 text-white">
            <span className="grid size-12 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Waves className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">Recanto das Águas</p>
              <p className="text-xs text-white/75">Área do hóspede</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">Sem aplicativo</p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight text-white xl:text-4xl">
              Sua comanda no celular
            </h2>
            <p className="mt-3 max-w-sm text-base text-white/90">
              Confirme consumos, acompanhe saldo e fique na sua permanência com segurança.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#ffffff] lg:w-[42%] lg:max-w-[42%] lg:flex-none lg:bg-[var(--login-surface)]">
        <main
          aria-label={title}
          className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 py-6 sm:px-8 lg:py-8"
        >
          <div className="mx-auto w-full max-w-[26rem]">{children}</div>
        </main>

        <footer className="shrink-0 border-t border-[var(--login-border)] px-4 py-3 text-center text-xs text-[var(--login-muted)] lg:border-0 lg:pb-6">
          Área do hóspede — sem app instalado.{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Acesso da equipe
          </Link>
        </footer>
      </div>
    </div>
  );
}

export function GuestEnterForm({
  initialCode = "",
  /** Credencial veio do QR — bloqueia edição e destaca campo de token/PIN. */
  lockCredential = false,
}: {
  initialCode?: string;
  lockCredential?: boolean;
}) {
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) setCode(initialCode.toUpperCase());
  }, [initialCode]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = code.trim().toUpperCase();
    if (!guestCredentialPattern.test(normalized)) {
      setError(
        "Use o código da credencial (ex.: RDA-R4F4-208A), não o usuário da equipe. Funcionários entram em /login.",
      );
      return;
    }
    const st = getState();
    const cred = st.credentials.find((c) => c.code === normalized);
    if (cred) {
      const lock = getPinLock(cred.id);
      if (lock && lock.until > Date.now()) {
        setError("Muitas tentativas. Aguarde 15 minutos ou procure a recepção.");
        return;
      }
    }
    try {
      const logged = loginCredential(st, code, pin);
      const stay = findStay(st, logged.stayId)!;
      const participant = findParticipant(stay, logged.participantId)!;
      clearPinFailures(logged.id);
      setGuestSession(
        guestSessionFromCredential(logged, participant.name, stay.room ? `Quarto ${stay.room}` : "Day use"),
      );
      toast.success(`Olá, ${participant.name}`);
      if (lockCredential) void navigate({ to: "/cliente" });
    } catch {
      if (cred) {
        recordPinFailure(cred.id);
        setError("PIN incorreto. Confira os dígitos ou ative o acesso se ainda não definiu um PIN.");
      } else {
        setError("Credencial não encontrada. Verifique o código ou peça uma nova credencial na recepção.");
      }
    }
  };

  return (
    <ClientGuestShell title={lockCredential ? "Token de acesso" : "Entrar com credencial e PIN"}>
      <Panel title={lockCredential ? "Acesso pelo QR" : "Já ativei meu acesso"}>
        <p className="mb-4 text-sm text-muted-foreground">
          {lockCredential
            ? "Credencial reconhecida pelo QR. Digite o token (PIN) que você definiu na ativação."
            : "Informe o código da sua credencial (QR ou pulseira) e o PIN que você definiu. Isso não é o login da equipe."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          {lockCredential ? (
            <div className="rounded-xl border border-border/80 bg-secondary/25 px-3 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Credencial</p>
              <p className="font-mono text-sm font-semibold text-foreground">{code || "—"}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="code">Credencial</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RDA-R4F4-208A"
                className="h-12 font-mono uppercase"
                autoComplete="off"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pin">{lockCredential ? "Token (PIN pessoal)" : "PIN pessoal"}</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="h-12 text-center text-lg tracking-widest"
              placeholder="••••"
              autoFocus={lockCredential}
              required
            />
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full text-base">
            Acessar minha conta
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Primeira vez?{" "}
          <Link to="/cliente/ativar" search={code ? { codigo: code } : {}} className="font-medium text-primary hover:underline">
            Ativar acesso
          </Link>
          {" · "}
          <Link to="/cliente/cadastro" className="font-medium text-primary hover:underline">
            Cadastro fictício
          </Link>
        </p>
        <details className="mt-4 rounded-xl border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Cliente fictício já cadastrado</summary>
          <p className="mt-2">
            Credencial <span className="font-mono text-foreground">{FICTIONAL_DEMO_GUEST.credential}</span> · PIN{" "}
            <span className="font-mono text-foreground">{FICTIONAL_DEMO_GUEST.pin}</span>
          </p>
        </details>
      </Panel>
    </ClientGuestShell>
  );
}

export function GuestRegisterForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("Visitante Demo");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ guestName: string; credentials: Credential[] } | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    let credentials: Credential[] = [];
    const err = commit((s) => {
      const { state: next, credentials: creds } = registerFictionalGuest(s, name);
      credentials = creds;
      return next;
    });
    if (err) return setError(err);
    setCreated({ guestName: name.trim(), credentials });
    toast.success("Cadastro fictício criado. Ative com o código de ativação.");
  };

  const cred = created?.credentials[0];

  return (
    <ClientGuestShell title="Cadastro fictício (demonstração)">
      {!created ? (
        <Panel title="Criar hóspede de teste">
          <p className="mb-4 text-sm text-muted-foreground">
            Simula o check-in em <b>day use</b> com credencial no celular. Na operação real isso é feito na recepção
            (RF03–RF06).
          </p>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="guest-name">Nome completo</Label>
              <Input
                id="guest-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Maria Silva"
                className="h-12"
                required
              />
            </div>
            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button type="submit" className="h-12 w-full gap-2 text-base">
              <UserPlus className="size-4" />
              Gerar credencial
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem acesso?{" "}
            <Link to="/cliente/entrar" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </Panel>
      ) : cred ? (
        <div className="space-y-4">
          <Panel title={`Olá, ${created.guestName}`}>
            <p className="text-sm text-muted-foreground">Guarde estes dados ou escaneie o QR para o primeiro acesso.</p>
            <p className="mt-3 font-mono text-lg font-semibold">{cred.code}</p>
            {cred.activationCode && (
              <p className="mt-1 text-sm">
                Código de ativação: <span className="font-mono font-semibold">{cred.activationCode}</span>
              </p>
            )}
            <CredentialCodes code={cred.code} compact />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-11 flex-1"
                onClick={() =>
                  void navigate({ to: "/cliente/ativar", search: { codigo: cred.code } })
                }
              >
                Ir para ativação
              </Button>
              <Button type="button" variant="outline" className="h-11 flex-1" asChild>
                <Link to="/acesso" search={{ codigo: cred.code }}>
                  Abrir link /acesso
                </Link>
              </Button>
            </div>
          </Panel>
          <p className="text-center text-sm text-muted-foreground">
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => setCreated(null)}>
              Cadastrar outra pessoa
            </button>
          </p>
        </div>
      ) : null}
    </ClientGuestShell>
  );
}

export function GuestActivationSuccess({ code }: { code: string }) {
  return (
    <ClientGuestShell title="Acesso pelo QR">
      <Panel>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-9" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Ativação feita com sucesso</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua credencial está pronta. Use o PIN que você criou para confirmar consumos.
            </p>
          </div>
          <p className="font-mono text-sm text-foreground">{code}</p>
          <Button asChild className="h-12 w-full max-w-xs text-base">
            <Link to="/cliente">Ir para minha conta</Link>
          </Button>
          <Link to="/cliente/entrar" search={{ codigo: code }} className="text-sm font-medium text-primary hover:underline">
            Entrar com outra sessão
          </Link>
        </div>
      </Panel>
    </ClientGuestShell>
  );
}

export function GuestActivateForm({
  initialCode = "",
  fromQr = false,
  onSuccess,
}: {
  initialCode?: string;
  /** Aberto via leitura de QR (`/acesso`). */
  fromQr?: boolean;
  onSuccess?: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [activation, setActivation] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const err = commit((s) => activateCredential(s, code, activation, newPin));
    if (err) return setError(err);
    try {
      const cred = loginCredential(getState(), code, newPin);
      const stay = findStay(getState(), cred.stayId)!;
      const participant = findParticipant(stay, cred.participantId)!;
      setGuestSession(
        guestSessionFromCredential(cred, participant.name, stay.room ? `Quarto ${stay.room}` : "Day use"),
      );
      if (onSuccess) onSuccess();
      else toast.success("Acesso ativado. Guarde seu PIN em local seguro.");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ClientGuestShell title={fromQr ? "Token da recepção" : "Primeiro acesso (RF07)"}>
      <Panel title={fromQr ? "Acesso pelo QR" : "Ativar com código da recepção"}>
        <p className="mb-4 text-sm text-muted-foreground">
          {fromQr
            ? "Informe o token de uso único que a recepção entregou e crie seu PIN para os próximos acessos."
            : "A recepção entrega a credencial e um código de uso único. Você cria seu PIN aqui; depois entra só com credencial + PIN."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          {fromQr && initialCode ? (
            <div className="rounded-xl border border-border/80 bg-secondary/25 px-3 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Credencial</p>
              <p className="font-mono text-sm font-semibold text-foreground">{code}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="code-a">Credencial</Label>
              <Input
                id="code-a"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RDA-CL4R-208C"
                className="h-12 font-mono uppercase"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="act">{fromQr ? "Token de ativação" : "Código de ativação"}</Label>
            <Input
              id="act"
              value={activation}
              onChange={(e) => setActivation(e.target.value)}
              placeholder="482913"
              className="h-12 font-mono text-center text-lg tracking-widest"
              inputMode="numeric"
              autoFocus={fromQr}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="npin">Criar PIN (4–6 dígitos)</Label>
            <Input
              id="npin"
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="h-12"
              required
            />
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full text-base">
            Ativar e entrar
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem PIN?{" "}
          <Link to="/cliente/entrar" search={code ? { codigo: code } : {}} className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </Panel>
    </ClientGuestShell>
  );
}

export function GuestHome({ guest, state }: { guest: GuestSession; state: State }) {
  const navigate = useNavigate();
  const cred = state.credentials.find((c) => c.id === guest.credentialId);
  const stay = cred ? findStay(state, cred.stayId) : undefined;
  const pending = useMemo(
    () => state.proposals.find((p) => p.credentialId === guest.credentialId && p.status === "aguardando"),
    [state.proposals, guest.credentialId],
  );
  const participantId = cred?.participantId;
  const myEntries = useMemo(
    () =>
      state.entries
        .filter((e) => e.participantId === participantId)
        .sort((a, b) => b.at - a.at),
    [state.entries, participantId],
  );
  const myProposals = useMemo(
    () =>
      state.proposals
        .filter((p) => p.credentialId === guest.credentialId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [state.proposals, guest.credentialId],
  );
  const accountEntries = stay ? state.entries.filter((e) => e.stayId === stay.id) : [];
  const payments = useMemo(
    () => (stay ? state.payments.filter((p) => p.stayId === stay.id).sort((a, b) => b.at - a.at) : []),
    [state.payments, stay],
  );
  const bals = stay ? balance(state, stay.id) : { debits: 0, paid: 0, due: 0 };

  const resolve = (decision: "confirmar" | "recusar") => {
    if (!pending || pending.status !== "aguardando") return;
    const err = commit((s) =>
      resolveProposal(s, {
        proposalId: pending.id,
        decision,
        via: "sessao",
        credentialId: guest.credentialId,
      }),
    );
    if (err) toast.error(err);
    else toast.message(decision === "confirmar" ? "Consumo confirmado." : "Proposta recusada.");
  };

  const logout = () => {
    clearGuestSession();
    void navigate({ to: "/cliente/entrar" });
    toast.message("Sessão encerrada. Ninguém mais acessa sua conta neste aparelho.");
  };

  const consumosList = (slice: Entry[]) => (
    <ul className="divide-y text-sm">
      {slice.map((e) => (
        <li key={e.id} className="flex justify-between gap-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{e.description}</span>
            <span className="text-xs text-muted-foreground">{fmtTime(e.at)}</span>
          </span>
          <span className={cn("tabular shrink-0 font-semibold", e.kind === "estorno" && "text-success")}>
            {e.kind === "estorno" ? "−" : ""}
            {brl(e.amount)}
          </span>
        </li>
      ))}
    </ul>
  );

  const propostasList = (slice: Proposal[]) => (
    <ul className="divide-y text-sm">
      {slice.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
          <span className="min-w-0 truncate">
            {fmtTime(p.createdAt)} · {brl(p.total)}
          </span>
          <StatusPill status={p.status} className="shrink-0" />
        </li>
      ))}
    </ul>
  );

  const pagamentosList = (slice: Payment[]) => (
    <ul className="divide-y text-sm">
      {slice.map((p) => (
        <li key={p.id} className="flex justify-between gap-2 py-2.5">
          <span className="truncate">
            {p.method} · {fmtTime(p.at)}
          </span>
          <span className="tabular shrink-0 font-semibold">{brl(p.amount)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-gradient-surface">
      <header className="shrink-0 border-b border-border/80 bg-card/95 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-accent-foreground shadow-sm">
              <Waves className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{guest.participantName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {guest.stayLabel} · credencial <span className="font-mono">{guest.code}</span>
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={logout}>
            <LogOut className="size-3.5" /> Sair
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:gap-5 sm:p-6 lg:grid-cols-2 lg:overflow-hidden lg:p-8 xl:grid-cols-3">
        <section className="flex min-h-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <Panel title="Saldo da permanência (RF22)" className="shrink-0">
            <div className="grid grid-cols-3 gap-3 text-center text-sm sm:gap-4">
              <div className="rounded-xl bg-secondary/50 px-2 py-3">
                <p className="text-muted-foreground">Consumos</p>
                <p className="tabular text-lg font-semibold">{brl(bals.debits)}</p>
              </div>
              <div className="rounded-xl bg-secondary/50 px-2 py-3">
                <p className="text-muted-foreground">Pagos</p>
                <p className="tabular text-lg font-semibold">{brl(bals.paid)}</p>
              </div>
              <div className="rounded-xl bg-primary/10 px-2 py-3">
                <p className="text-muted-foreground">Saldo</p>
                <p className="tabular text-lg font-semibold text-primary">{brl(bals.due)}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Pedido aguardando" className="shrink-0">
            {pending ? (
              <ProposalReview proposal={pending} onConfirm={() => resolve("confirmar")} onRefuse={() => resolve("recusar")} />
            ) : (
              <EmptyState
                icon={<Smartphone className="size-5" />}
                title="Nenhuma proposta pendente"
                hint="Mantenha esta página aberta; novas propostas aparecem em poucos segundos."
              />
            )}
          </Panel>

          <div className="hidden min-h-0 flex-1 flex-col xl:flex">
            <GuestPagedPanel<Proposal>
              title="Propostas recentes"
              items={myProposals}
              empty={<p className="text-sm text-muted-foreground">Nenhuma proposta ainda.</p>}
              renderList={propostasList}
            />
          </div>

          {payments.length > 0 && (
            <div className="hidden xl:block">
              <GuestPagedPanel<Payment>
                title="Pagamentos na conta"
                items={payments}
                empty={null}
                renderList={pagamentosList}
              />
            </div>
          )}
        </section>

        <section className="flex min-h-0 min-w-0 flex-col lg:min-h-0">
          <GuestPagedPanel<Entry>
            title="Meus consumos confirmados"
            items={myEntries}
            empty={<p className="text-sm text-muted-foreground">Sem lançamentos para você ainda.</p>}
            renderList={consumosList}
          />
        </section>

        <section className="flex min-h-0 flex-col gap-4 lg:col-span-2 lg:min-h-0 lg:overflow-y-auto xl:col-span-1 xl:col-start-auto">
          <div className="xl:hidden">
            <GuestPagedPanel<Proposal>
              title="Propostas recentes"
              items={myProposals}
              empty={<p className="text-sm text-muted-foreground">Nenhuma proposta ainda.</p>}
              renderList={propostasList}
            />
          </div>

          {payments.length > 0 && (
            <div className="xl:hidden">
              <GuestPagedPanel<Payment>
                title="Pagamentos na conta"
                items={payments}
                empty={null}
                renderList={pagamentosList}
              />
            </div>
          )}

          {accountEntries.length > myEntries.length && (
            <p className="rounded-xl border border-border/80 bg-card/80 px-4 py-3 text-center text-xs text-muted-foreground shadow-soft">
              Outros participantes também consomem nesta permanência. Você só confirma propostas enviadas para a sua credencial.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
