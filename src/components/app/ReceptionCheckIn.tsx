import { Link } from "@tanstack/react-router";
import { BedDouble, Plus, Sun, Trash2, UserRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CredentialCodes, Panel } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listRoomAvailability, type RoomAvailability } from "@/lib/hotel-rooms";
import { openStay, type Credential, type CredentialMedium, type GuestInput, type StayType } from "@/lib/domain";
import { commit, getState, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type CompanionRow = { id: string; name: string };

function newRow(): CompanionRow {
  return { id: crypto.randomUUID(), name: "" };
}

export type CheckInSuccessResult = {
  stayId: string;
  holderName: string;
  room?: string;
  type: StayType;
  credentialCodes: string[];
};

type CheckInFormProps = {
  actor: string;
  variant?: "page" | "modal";
  onSuccess?: (result: CheckInSuccessResult) => void;
};

function CheckInSectionCompact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function CheckInSectionPanel({ title, children }: { title: string; children: ReactNode }) {
  return <Panel title={title}>{children}</Panel>;
}

export function ReceptionCheckInForm({ actor, variant = "page", onSuccess }: CheckInFormProps) {
  const stays = useStore((s) => s.stays);
  const rooms = useMemo(() => listRoomAvailability({ ...getState(), stays }), [stays]);
  const compact = variant === "modal";

  const [type, setType] = useState<StayType>("hospedagem");
  const [room, setRoom] = useState<string | null>(null);
  const [holderName, setHolderName] = useState("");
  const [holderDocument, setHolderDocument] = useState("");
  const [holderPhone, setHolderPhone] = useState("");
  const [companions, setCompanions] = useState<CompanionRow[]>([]);
  const [medium, setMedium] = useState<CredentialMedium>("celular");
  const [issuedCreds, setIssuedCreds] = useState<Credential[]>([]);

  const freeCount = rooms.filter((r) => r.status === "livre").length;

  const clearFields = () => {
    setHolderName("");
    setHolderDocument("");
    setHolderPhone("");
    setCompanions([]);
    setRoom(null);
    setType("hospedagem");
  };

  const selectRoom = (r: RoomAvailability) => {
    if (r.status !== "livre") return;
    setRoom(r.number);
  };

  const buildGuests = (): GuestInput[] => {
    const guests: GuestInput[] = [
      {
        name: holderName,
        document: holderDocument || undefined,
        phone: holderPhone || undefined,
      },
    ];
    for (const c of companions) {
      if (c.name.trim().length >= 2) guests.push({ name: c.name.trim() });
    }
    return guests;
  };

  const submit = () => {
    if (type === "hospedagem" && !room) {
      toast.error("Selecione um quarto disponível.");
      return;
    }
    const guests = buildGuests();
    if (guests.length === 0 || guests[0]!.name.trim().length < 2) {
      toast.error("Informe o nome do responsável.");
      return;
    }

    let stayId = "";
    const err = commit((s) => {
      const { state: next, stay } = openStay(
        s,
        {
          type,
          room: type === "hospedagem" ? room ?? undefined : undefined,
          guests,
          medium,
        },
        actor,
      );
      stayId = stay.id;
      return next;
    });
    if (err) {
      toast.error(err);
      return;
    }

    const creds = getState().credentials.filter((c) => c.stayId === stayId && c.status === "ativa");
    setIssuedCreds(creds);
    const holderName = guests[0]!.name.trim();
    toast.success("Cliente cadastrado e credenciais emitidas.");
    clearFields();
    onSuccess?.({
      stayId,
      holderName,
      room: type === "hospedagem" ? room ?? undefined : undefined,
      type,
      credentialCodes: creds.map((c) => c.code),
    });
  };

  const Section = compact ? CheckInSectionCompact : CheckInSectionPanel;

  return (
    <div className={cn("flex flex-col", compact ? "gap-4" : "gap-5")}>
      <Section title="1 · Tipo de permanência">
        <div className={cn("grid gap-2", compact ? "grid-cols-2" : "gap-3 sm:grid-cols-2")}>
          <button
            type="button"
            onClick={() => setType("hospedagem")}
            className={cn(
              "flex items-center gap-2 rounded-xl border p-3 text-left transition-all",
              compact ? "flex-col items-start p-2.5" : "flex-col items-start gap-2 p-4",
              type === "hospedagem"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border/80 bg-card hover:border-primary/30",
            )}
          >
            <span className="grid size-9 place-items-center rounded-lg bg-brand-gradient text-accent-foreground">
              <BedDouble className="size-4" />
            </span>
            <span className="text-sm font-semibold">Hospedagem</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType("dayuse");
              setRoom(null);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl border p-3 text-left transition-all",
              compact ? "flex-col items-start p-2.5" : "flex-col items-start gap-2 p-4",
              type === "dayuse"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border/80 bg-card hover:border-primary/30",
            )}
          >
            <span className="grid size-9 place-items-center rounded-lg bg-brand-gradient text-accent-foreground">
              <Sun className="size-4" />
            </span>
            <span className="text-sm font-semibold">Day use</span>
          </button>
        </div>
      </Section>

      {type === "hospedagem" ? (
        <Section title={`2 · Quartos disponíveis (${freeCount} livres)`}>
          <div
            className={cn(
              "grid grid-cols-3 gap-1.5 sm:grid-cols-4",
              compact && "max-h-36 overflow-y-auto pr-1",
            )}
          >
            {rooms.map((r) => {
              const selected = room === r.number;
              const busy = r.status === "ocupado";
              return (
                <button
                  key={r.number}
                  type="button"
                  disabled={busy}
                  onClick={() => selectRoom(r)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-left text-xs transition-all",
                    busy && "cursor-not-allowed opacity-50",
                    !busy && !selected && "border-border/80 bg-card hover:border-primary/35",
                    selected && "border-primary bg-primary/10 ring-1 ring-primary/25",
                  )}
                >
                  <span className="font-semibold tabular-nums">{r.number}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[9px] uppercase",
                      busy ? "text-muted-foreground" : "text-success",
                    )}
                  >
                    {busy ? "Em uso" : "Livre"}
                  </span>
                </button>
              );
            })}
          </div>
          {room ? (
            <p className="text-xs text-muted-foreground">
              Quarto <span className="font-semibold text-foreground">{room}</span>
            </p>
          ) : null}
        </Section>
      ) : (
        <Section title="2 · Day use">
          <p className="text-xs text-muted-foreground">Sem quarto — permanência day use na comanda digital.</p>
        </Section>
      )}

      <Section title="3 · Dados do cliente">
        <div className="space-y-3">
          <div className={cn("grid gap-2", compact ? "grid-cols-1" : "gap-3 sm:grid-cols-2")}>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="holder-name" className="text-xs">
                Nome completo *
              </Label>
              <Input
                id="holder-name"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Ex.: Carla Mendes"
                className="h-9"
              />
            </div>
            {!compact && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="holder-doc" className="text-xs">
                    CPF (opcional)
                  </Label>
                  <Input
                    id="holder-doc"
                    value={holderDocument}
                    onChange={(e) => setHolderDocument(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="holder-phone" className="text-xs">
                    Telefone
                  </Label>
                  <Input
                    id="holder-phone"
                    value={holderPhone}
                    onChange={(e) => setHolderPhone(e.target.value)}
                    className="h-9"
                    inputMode="tel"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <UserRound className="size-3.5" /> Acompanhantes
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setCompanions((c) => [...c, newRow()])}
            >
              <Plus className="size-3" /> Adicionar
            </Button>
          </div>
          {companions.length > 0 && (
            <ul className="space-y-1.5">
              {companions.map((row, i) => (
                <li key={row.id} className="flex gap-1.5">
                  <Input
                    value={row.name}
                    onChange={(e) =>
                      setCompanions((list) => list.map((x) => (x.id === row.id ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder={`Acompanhante ${i + 1}`}
                    className="h-9 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => setCompanions((list) => list.filter((x) => x.id !== row.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Meio da credencial</Label>
            <Select value={medium} onValueChange={(v) => setMedium(v as CredentialMedium)}>
              <SelectTrigger className="h-9 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="celular">Celular (web)</SelectItem>
                <SelectItem value="pulseira">Pulseira</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="button" className="h-10 w-full" onClick={submit}>
            Cadastrar e emitir credenciais
          </Button>
        </div>
      </Section>

      {issuedCreds.length > 0 && !compact && (
        <Panel title="Credenciais emitidas">
          <CredentialList creds={issuedCreds} />
        </Panel>
      )}
    </div>
  );
}

function CredentialList({ creds }: { creds: Credential[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {creds.map((c) => {
        const p = getState()
          .stays.find((st) => st.id === c.stayId)
          ?.participants.find((x) => x.id === c.participantId);
        return (
          <li key={c.id} className="rounded-xl border bg-secondary/25 p-3">
            <p className="text-sm font-semibold">{p?.name}</p>
            <p className="font-mono text-xs">{c.code}</p>
            {c.activationCode && (
              <p className="mt-1 text-xs">
                Ativação: <span className="font-mono font-semibold">{c.activationCode}</span>
              </p>
            )}
            <Link to="/acesso" search={{ codigo: c.code }} className="text-xs text-primary hover:underline" target="_blank">
              Link de ativação
            </Link>
            <div className="mt-2 origin-top scale-90">
              <CredentialCodes code={c.code} compact />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ReceptionCheckInDialog({
  open,
  onOpenChange,
  actor,
  onCheckInSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: string;
  onCheckInSuccess?: (result: CheckInSuccessResult) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border/80 px-5 py-4 text-left">
          <DialogTitle>Novo cliente · Check-in</DialogTitle>
          <DialogDescription>Tipo de permanência, quarto e dados do hóspede.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ReceptionCheckInForm
            actor={actor}
            variant="modal"
            onSuccess={(result) => {
              onCheckInSuccess?.(result);
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Página dedicada (atalho /recepcao/cadastro redireciona para recepção). */
export function ReceptionCheckIn({ actor }: { actor: string }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cadastro de cliente</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use o painel Recepção para abrir o cadastro em modal.</p>
      </div>
      <ReceptionCheckInForm actor={actor} variant="page" />
    </div>
  );
}
