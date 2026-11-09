import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CheckCircle2, LogOut, Smartphone, UserPlus, Waves } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
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

export function ClientGuestShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-card">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <span className="grid size-10 place-items-center rounded-lg bg-brand-gradient text-primary-foreground">
            <Waves className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold leading-tight">Recanto das Águas</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-lg px-4 pb-10 text-center text-xs text-muted-foreground">
        Área do hóspede — sem app instalado.{" "}
        <Link to="/login" className="text-primary hover:underline">
          Acesso da equipe
        </Link>
      </footer>
    </div>
  );
}

export function GuestEnterForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const st = getState();
    const cred = st.credentials.find((c) => c.code === code.trim().toUpperCase());
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
    } catch (e) {
      const msg = (e as DomainError).message;
      if (cred) recordPinFailure(cred.id);
      setError(msg);
    }
  };

  return (
    <ClientGuestShell title="Entrar com credencial e PIN">
      <Panel title="Já ativei meu acesso">
        <p className="mb-4 text-sm text-muted-foreground">
          Informe o código da sua credencial (QR ou pulseira) e o PIN que você definiu. Isso não é o login da equipe.
        </p>
        <form onSubmit={submit} className="space-y-3">
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
          <div className="space-y-1.5">
            <Label htmlFor="pin">PIN pessoal</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="h-12"
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
  onSuccess,
}: {
  initialCode?: string;
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
    <ClientGuestShell title="Primeiro acesso (RF07)">
      <Panel title="Ativar com código da recepção">
        <p className="mb-4 text-sm text-muted-foreground">
          A recepção entrega a credencial e um <b>código de uso único</b>. Você cria seu PIN aqui; depois entra só com credencial + PIN.
        </p>
        <form onSubmit={submit} className="space-y-3">
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
          <div className="space-y-1.5">
            <Label htmlFor="act">Código de ativação</Label>
            <Input
              id="act"
              value={activation}
              onChange={(e) => setActivation(e.target.value)}
              placeholder="482913"
              className="h-12 font-mono"
              inputMode="numeric"
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
  const recent = state.proposals.filter((p) => p.credentialId === guest.credentialId).slice(0, 6);
  const participantId = cred?.participantId;
  const myEntries = state.entries.filter((e) => e.participantId === participantId);
  const accountEntries = stay ? state.entries.filter((e) => e.stayId === stay.id) : [];
  const payments = stay ? state.payments.filter((p) => p.stayId === stay.id) : [];
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

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{guest.participantName}</p>
            <p className="text-xs text-muted-foreground">
              {guest.stayLabel} · credencial <span className="font-mono">{guest.code}</span>
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={logout}>
            <LogOut className="size-3.5" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <Panel title="Saldo da permanência (RF22)">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Consumos</p>
              <p className="tabular font-semibold">{brl(bals.debits)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pagos</p>
              <p className="tabular font-semibold">{brl(bals.paid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Saldo</p>
              <p className="tabular font-semibold text-primary">{brl(bals.due)}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Pedido aguardando">
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

        <Panel title="Meus consumos confirmados">
          {myEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem lançamentos para você ainda.</p>
          ) : (
            <ul className="divide-y text-sm">
              {myEntries.map((e) => (
                <li key={e.id} className="flex justify-between gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{e.description}</span>
                    <span className="text-xs text-muted-foreground">{fmtTime(e.at)}</span>
                  </span>
                  <span className={`tabular font-medium ${e.kind === "estorno" ? "text-success" : ""}`}>
                    {e.kind === "estorno" ? "−" : ""}
                    {brl(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {payments.length > 0 && (
          <Panel title="Pagamentos na conta">
            <ul className="divide-y text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <span>
                    {p.method} · {fmtTime(p.at)}
                  </span>
                  <span className="tabular font-medium">{brl(p.amount)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title="Propostas recentes">
          <ul className="space-y-2 text-sm">
            {recent.length === 0 ? (
              <li className="text-muted-foreground">Nenhuma proposta ainda.</li>
            ) : (
              recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{fmtTime(p.createdAt)} · {brl(p.total)}</span>
                  <StatusPill status={p.status} />
                </li>
              ))
            )}
          </ul>
        </Panel>

        {accountEntries.length > myEntries.length && (
          <p className="text-center text-xs text-muted-foreground">
            Outros participantes também consomem nesta permanência. Você só confirma propostas enviadas para a sua credencial.
          </p>
        )}
      </main>
    </div>
  );
}
