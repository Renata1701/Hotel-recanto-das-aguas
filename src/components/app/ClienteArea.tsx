import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, LogOut, Smartphone, UserPlus, Waves } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CredentialCodes, EmptyState, Panel, StatusPill, fmtTime } from "@/components/app/shared";
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
import { authenticate, resolvePostLoginPath, setStaffSession } from "@/lib/auth";
import { commit, getState } from "@/lib/store";
import { cn } from "@/lib/utils";
import hero from "@/assets/hero-pool.jpg";

const guestCredentialPattern = /^RDA-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

function isGuestAccessCode(value: string) {
  return guestCredentialPattern.test(value.trim().toUpperCase());
}
/** Itens por página — evita “buracos” com listas curtas no painel. */
const GUEST_LIST_PAGE_SIZE = 10;

function GuestListPagination({
  page,
  pageSize,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3">
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{from}–{to}</span> de {total}
      </p>
      <div className="flex gap-1.5">
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
        <span className="grid h-8 min-w-[4.5rem] place-items-center rounded-md border border-border/80 bg-muted/40 px-2 text-xs font-medium tabular">
          {page} / {totalPages}
        </span>
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
  className,
  listClassName,
}: {
  title: string;
  items: T[];
  empty: ReactNode;
  renderList: (slice: T[]) => ReactNode;
  className?: string;
  /** Scroll interno só quando a lista é longa */
  listClassName?: string;
}) {
  const { slice, page, setPage, totalPages, total } = usePagedList(items, GUEST_LIST_PAGE_SIZE);
  const scrollList = items.length > GUEST_LIST_PAGE_SIZE;

  return (
    <Panel title={title} className={cn("w-full self-start", className)}>
      {items.length === 0 ? (
        empty
      ) : (
        <>
          <div
            className={cn(
              scrollList && "max-h-[min(52vh,22rem)] overflow-y-auto pr-1",
              listClassName,
            )}
          >
            {renderList(slice)}
          </div>
          <GuestListPagination
            page={page}
            pageSize={GUEST_LIST_PAGE_SIZE}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
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
            <h2 className="max-w-md text-3xl font-semibold leading-tight text-white xl:text-4xl">
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

        <footer className="shrink-0 border-t border-[var(--login-border)] px-4 py-4 lg:border-0 lg:pb-6">
          <p className="text-center text-xs text-[var(--login-muted)]">
            Hóspede ou equipe — credencial/usuário e PIN/senha no mesmo formulário.
          </p>
        </footer>
      </div>
    </div>
  );
}

/** Hóspede (RDA + PIN) ou equipe (usuário + senha) no mesmo formulário. */
export function GuestCredentialPinForm({
  initialCode = "",
  lockCredential = false,
  staffRedirect,
}: {
  initialCode?: string;
  lockCredential?: boolean;
  staffRedirect?: string;
}) {
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode);
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guestMode = useMemo(() => lockCredential || isGuestAccessCode(code), [code, lockCredential]);

  useEffect(() => {
    if (initialCode) setCode(initialCode.toUpperCase());
  }, [initialCode]);

  const onCodeChange = (raw: string) => {
    const upper = raw.toUpperCase();
    if (upper.startsWith("RDA") || guestCredentialPattern.test(upper)) {
      setCode(upper);
    } else {
      setCode(raw);
    }
  };

  const submitStaff = (login: string, password: string) => {
    const session = authenticate(login, password);
    if (!session) {
      setError("Usuário ou senha inválidos. Ex.: admin / 1234 ou lucas / 1234.");
      return;
    }
    setStaffSession(session);
    toast.success(`Bem-vindo, ${session.name}`);
    void navigate({ to: resolvePostLoginPath(staffRedirect, session) });
  };

  const submitGuest = (normalized: string, pin: string) => {
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
      const logged = loginCredential(st, normalized, pin);
      const stay = findStay(st, logged.stayId)!;
      const participant = findParticipant(stay, logged.participantId)!;
      clearPinFailures(logged.id);
      setGuestSession(
        guestSessionFromCredential(logged, participant.name, stay.room ? `Quarto ${stay.room}` : "Day use"),
      );
      toast.success(`Olá, ${participant.name}`);
      void navigate({ to: "/cliente" });
    } catch {
      if (cred) {
        recordPinFailure(cred.id);
        setError("PIN incorreto. Confira os dígitos ou ative o acesso se ainda não definiu um PIN.");
      } else {
        setError("Credencial não encontrada. Verifique o código ou peça uma nova credencial na recepção.");
      }
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Informe a credencial RDA-… ou o usuário da equipe.");
      return;
    }

    if (guestMode || lockCredential) {
      const normalized = trimmed.toUpperCase();
      if (!guestCredentialPattern.test(normalized)) {
        setError("Credencial inválida. Use o formato RDA-… (QR ou pulseira).");
        return;
      }
      submitGuest(normalized, secret);
      return;
    }

    if (trimmed.toUpperCase().startsWith("RDA")) {
      setError("Credencial incompleta ou inválida. Confira o código ou use seu usuário de equipe.");
      return;
    }

    submitStaff(trimmed, secret);
  };

  const form = (
    <form onSubmit={submit} className="space-y-3" autoComplete="on">
      {lockCredential ? (
        <div className="rounded-xl border border-border/80 bg-secondary/25 px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Credencial</p>
          <p className="font-mono text-sm font-semibold text-foreground">{code || "—"}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="access-id">Credencial ou usuário</Label>
          <Input
            id="access-id"
            name="access-id"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="RDA-R4F4-208A ou admin"
            className={cn("h-12", guestMode && "font-mono uppercase")}
            autoComplete="username"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="access-secret">{lockCredential ? "Token (PIN pessoal)" : guestMode ? "PIN pessoal" : "Senha"}</Label>
        <div className="relative">
          <Input
            id="access-secret"
            name="access-secret"
            type={guestMode ? "password" : showSecret ? "text" : "password"}
            inputMode={guestMode ? "numeric" : undefined}
            autoComplete={guestMode ? "off" : "current-password"}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className={cn("h-12", !guestMode && "pr-11", guestMode && "text-center text-lg tracking-widest")}
            placeholder={guestMode ? "••••" : "••••••••"}
            autoFocus={lockCredential}
            required
          />
          {!guestMode ? (
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted"
              aria-label={showSecret ? "Ocultar senha" : "Mostrar senha"}
            >
              {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="login-resort-btn h-12 w-full border-0 text-base shadow-none">
        Acessar minha conta
      </Button>
    </form>
  );

  return (
    <ClientGuestShell title={lockCredential ? "Token de acesso" : "Área de Acesso"}>
      <Panel title={lockCredential ? "Digite seu PIN" : "Entrar"}>
        <p className="mb-4 text-sm text-muted-foreground">
          {lockCredential
            ? "Credencial lida pelo QR. Informe seu PIN pessoal (4 dígitos)."
            : "Hóspede: credencial RDA e PIN. Equipe: usuário (ex. lucas, admin) e senha no mesmo formulário."}
        </p>
        {form}
        {!lockCredential ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Primeira vez?{" "}
            <Link to="/cliente/ativar" search={code && guestMode ? { codigo: code.toUpperCase() } : {}} className="font-medium text-primary hover:underline">
              Ativar acesso
            </Link>
          </p>
        ) : null}
      </Panel>
    </ClientGuestShell>
  );
}

export function GuestEnterForm(props: {
  initialCode?: string;
  lockCredential?: boolean;
  staffRedirect?: string;
}) {
  return <GuestCredentialPinForm {...props} />;
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

      <main className="grid auto-rows-min flex-1 items-start gap-4 overflow-y-auto p-4 sm:gap-5 sm:p-6 lg:grid-cols-2 lg:p-8">
        <section className="flex w-full flex-col gap-4 self-start">
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

          <GuestPagedPanel<Proposal>
            title="Propostas recentes"
            items={myProposals}
            empty={<p className="text-sm text-muted-foreground">Nenhuma proposta ainda.</p>}
            renderList={propostasList}
          />

          {payments.length > 0 ? (
            <GuestPagedPanel<Payment>
              title="Pagamentos na conta"
              items={payments}
              empty={null}
              renderList={pagamentosList}
            />
          ) : null}
        </section>

        <section className="flex w-full min-w-0 flex-col gap-3 self-start">
          <GuestPagedPanel<Entry>
            title="Meus consumos confirmados"
            items={myEntries}
            empty={<p className="text-sm text-muted-foreground">Sem lançamentos para você ainda.</p>}
            renderList={consumosList}
          />
          {accountEntries.length > myEntries.length ? (
            <p className="rounded-xl border border-border/80 bg-card/80 px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-soft">
              Outros participantes também consomem nesta permanência. Você só confirma propostas enviadas para a sua credencial.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
