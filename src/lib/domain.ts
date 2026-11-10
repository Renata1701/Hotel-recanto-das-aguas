/**
 * Pure domain model and rules (RN/RF from the requirements doc).
 * Every mutation is a pure function (state, input) => result so it is testable
 * and can be swapped for API calls when the Java server exists.
 */

export const PROPOSAL_TTL_MS = 5 * 60 * 1000;

export type Sector = "Bar da Piscina" | "Restaurante" | "Lanchonete";
export type Category = "Bebidas" | "Drinks" | "Porções" | "Pratos" | "Sobremesas";

export interface Product {
  id: string;
  name: string;
  category: Category;
  description: string;
  price: number; // cents
  available: boolean;
  /** Cardápio do setor físico (bar, restaurante ou lanchonete). */
  sector: Sector;
}

export function productsInSector(products: Product[], sector: Sector) {
  return products.filter((p) => p.sector === sector);
}

export type StayType = "hospedagem" | "dayuse";
export type AccountStatus = "aberta" | "em_fechamento" | "encerrada";

export interface Participant {
  id: string;
  name: string;
  document?: string;
  phone?: string;
}

export type GuestInput = {
  name: string;
  document?: string;
  phone?: string;
};

export interface Stay {
  id: string;
  type: StayType;
  room?: string | undefined;
  holderId: string;
  participants: Participant[];
  status: AccountStatus;
  openedAt: number;
  closedAt?: number | undefined;
}

export type CredentialStatus = "ativa" | "bloqueada" | "expirada" | "revogada";
export type CredentialMedium = "celular" | "pulseira";

export interface Credential {
  id: string;
  code: string; // random identifier encoded in QR / Code 128
  stayId: string;
  participantId: string;
  medium: CredentialMedium;
  status: CredentialStatus;
  pin?: string | undefined;
  activationCode?: string | undefined; // single use, cleared after activation
  issuedAt: number;
}

export type ProposalStatus = "aguardando" | "confirmada" | "recusada" | "expirada" | "cancelada";

export interface ProposalItem {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  note?: string | undefined;
}

export interface Proposal {
  id: string;
  operationId: string;
  stayId: string;
  participantId: string;
  credentialId: string;
  sector: Sector;
  attendant: string;
  items: ProposalItem[];
  total: number;
  status: ProposalStatus;
  createdAt: number;
  expiresAt: number;
  resolvedAt?: number | undefined;
  resolvedVia?: "sessao" | "terminal" | undefined;
}

export interface Entry {
  id: string;
  stayId: string;
  kind: "debito" | "estorno";
  proposalId?: string | undefined;
  participantId?: string | undefined;
  amount: number; // positive cents; estorno subtracts
  description: string;
  author: string;
  reason?: string | undefined;
  at: number;
}

export type PaymentMethod = "Pix" | "Crédito" | "Débito" | "Dinheiro";

export interface Payment {
  id: string;
  stayId: string;
  amount: number;
  method: PaymentMethod;
  staff: string;
  at: number;
}

export interface AuditLog {
  id: string;
  at: number;
  actor: string;
  action: string;
}

export interface State {
  products: Product[];
  stays: Stay[];
  credentials: Credential[];
  proposals: Proposal[];
  entries: Entry[];
  payments: Payment[];
  audit: AuditLog[];
}

export class DomainError extends Error {}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export function newCredentialCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `RDA-${block()}-${block()}`;
}

export function newActivationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ---------- queries ---------- */

export const findStay = (s: State, id: string) => s.stays.find((x) => x.id === id);
export const findParticipant = (stay: Stay | undefined, id: string) =>
  stay?.participants.find((p) => p.id === id);

export function resolveCredential(s: State, raw: string) {
  const code = raw.trim().toUpperCase();
  const cred = s.credentials.find((c) => c.code === code);
  if (!cred) throw new DomainError("Credencial não encontrada.");
  if (cred.status !== "ativa") throw new DomainError(`Credencial ${cred.status}. Procure a recepção.`);
  const stay = findStay(s, cred.stayId);
  if (!stay) throw new DomainError("Permanência inexistente.");
  if (stay.status !== "aberta") throw new DomainError("Conta não está aberta para consumo.");
  const participant = findParticipant(stay, cred.participantId)!;
  return { cred, stay, participant };
}

export function balance(s: State, stayId: string) {
  const debits = s.entries
    .filter((e) => e.stayId === stayId)
    .reduce((acc, e) => acc + (e.kind === "debito" ? e.amount : -e.amount), 0);
  const paid = s.payments.filter((p) => p.stayId === stayId).reduce((a, p) => a + p.amount, 0);
  return { debits, paid, due: debits - paid };
}

export const calcTotal = (items: ProposalItem[]) =>
  items.reduce((acc, i) => acc + i.unitPrice * i.qty, 0);

/* ---------- commands ---------- */

const log = (s: State, actor: string, action: string): AuditLog[] => [
  { id: uid("log"), at: Date.now(), actor, action },
  ...s.audit,
].slice(0, 200);

export function expireStale(s: State, now = Date.now()): State {
  let changed = false;
  const proposals = s.proposals.map((p) => {
    if (p.status === "aguardando" && p.expiresAt <= now) {
      changed = true;
      return { ...p, status: "expirada" as const, resolvedAt: now };
    }
    return p;
  });
  return changed ? { ...s, proposals } : s;
}

export function createProposal(
  s: State,
  input: {
    credentialCode: string;
    sector: Sector;
    attendant: string;
    items: { productId: string; qty: number; note?: string | undefined }[];
    operationId: string;
  },
  now = Date.now(),
): { state: State; proposal: Proposal } {
  // idempotency: same operationId returns the existing proposal (RN offline/duplicity)
  const existing = s.proposals.find((p) => p.operationId === input.operationId);
  if (existing) return { state: s, proposal: existing };

  const { cred, stay } = resolveCredential(s, input.credentialCode);
  if (input.items.length === 0) throw new DomainError("Adicione ao menos um produto.");
  const items: ProposalItem[] = input.items.map((i) => {
    const product = s.products.find((p) => p.id === i.productId);
    if (!product) throw new DomainError("Produto inexistente.");
    if (!product.available) throw new DomainError(`${product.name} está indisponível.`);
    if (product.sector !== input.sector)
      throw new DomainError(`${product.name} não pertence ao setor ${input.sector}.`);
    if (!Number.isInteger(i.qty) || i.qty <= 0) throw new DomainError("Quantidade inválida.");
    return { productId: product.id, name: product.name, unitPrice: product.price, qty: i.qty, note: i.note };
  });
  const proposal: Proposal = {
    id: uid("prp"),
    operationId: input.operationId,
    stayId: stay.id,
    participantId: cred.participantId,
    credentialId: cred.id,
    sector: input.sector,
    attendant: input.attendant,
    items,
    total: calcTotal(items),
    status: "aguardando",
    createdAt: now,
    expiresAt: now + PROPOSAL_TTL_MS,
  };
  return {
    state: {
      ...s,
      proposals: [proposal, ...s.proposals],
      audit: log(s, input.attendant, `Proposta ${proposal.id} enviada (${stay.room ?? "day use"})`),
    },
    proposal,
  };
}

export function resolveProposal(
  s: State,
  input: {
    proposalId: string;
    decision: "confirmar" | "recusar";
    via: "sessao" | "terminal";
    credentialId?: string; // session auth
    pin?: string; // terminal auth
  },
  now = Date.now(),
): State {
  const state = expireStale(s, now);
  const p = state.proposals.find((x) => x.id === input.proposalId);
  if (!p) throw new DomainError("Proposta não encontrada.");
  if (p.status !== "aguardando") throw new DomainError(`Proposta já ${p.status}. Solicite uma nova.`);
  const cred = state.credentials.find((c) => c.id === p.credentialId)!;
  if (cred.status !== "ativa") throw new DomainError("Credencial inativa.");
  if (input.via === "sessao" && input.credentialId !== cred.id)
    throw new DomainError("Esta proposta não pertence à sua credencial.");
  if (input.via === "terminal" && (!cred.pin || cred.pin !== input.pin))
    throw new DomainError("PIN incorreto.");
  const stay = findStay(state, p.stayId)!;

  if (input.decision === "recusar") {
    return {
      ...state,
      proposals: state.proposals.map((x) =>
        x.id === p.id ? { ...x, status: "recusada", resolvedAt: now, resolvedVia: input.via } : x,
      ),
      audit: log(state, "cliente", `Proposta ${p.id} recusada`),
    };
  }

  if (stay.status !== "aberta") throw new DomainError("Conta em fechamento: confirmação bloqueada.");
  for (const item of p.items) {
    const prod = state.products.find((x) => x.id === item.productId);
    if (!prod?.available) throw new DomainError(`${item.name} ficou indisponível. Crie nova proposta.`);
  }
  if (state.entries.some((e) => e.proposalId === p.id)) throw new DomainError("Débito já lançado.");

  const entry: Entry = {
    id: uid("ent"),
    stayId: p.stayId,
    kind: "debito",
    proposalId: p.id,
    participantId: p.participantId,
    amount: p.total,
    description: `${p.sector} · ${p.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}`,
    author: p.attendant,
    at: now,
  };
  return {
    ...state,
    proposals: state.proposals.map((x) =>
      x.id === p.id ? { ...x, status: "confirmada", resolvedAt: now, resolvedVia: input.via } : x,
    ),
    entries: [entry, ...state.entries],
    audit: log(state, "cliente", `Proposta ${p.id} confirmada · débito lançado`),
  };
}

export function cancelProposal(s: State, proposalId: string, actor: string, now = Date.now()): State {
  const p = s.proposals.find((x) => x.id === proposalId);
  if (!p || p.status !== "aguardando") throw new DomainError("Só é possível cancelar propostas aguardando.");
  return {
    ...s,
    proposals: s.proposals.map((x) => (x.id === proposalId ? { ...x, status: "cancelada", resolvedAt: now } : x)),
    audit: log(s, actor, `Proposta ${proposalId} cancelada`),
  };
}

const cancelPendingFor = (proposals: Proposal[], pred: (p: Proposal) => boolean, now: number) =>
  proposals.map((p) => (p.status === "aguardando" && pred(p) ? { ...p, status: "cancelada" as const, resolvedAt: now } : p));

export function blockCredential(s: State, credentialId: string, actor: string, now = Date.now()): State {
  return {
    ...s,
    credentials: s.credentials.map((c) => (c.id === credentialId ? { ...c, status: "bloqueada" } : c)),
    proposals: cancelPendingFor(s.proposals, (p) => p.credentialId === credentialId, now),
    audit: log(s, actor, `Credencial ${credentialId} bloqueada`),
  };
}

export function reissueCredential(s: State, credentialId: string, actor: string, now = Date.now()) {
  const old = s.credentials.find((c) => c.id === credentialId);
  if (!old) throw new DomainError("Credencial inexistente.");
  const fresh: Credential = {
    ...old,
    id: uid("crd"),
    code: newCredentialCode(),
    status: "ativa",
    pin: undefined,
    activationCode: newActivationCode(),
    issuedAt: now,
  };
  const state: State = {
    ...s,
    credentials: [
      fresh,
      ...s.credentials.map((c) => (c.id === credentialId ? { ...c, status: "revogada" as const } : c)),
    ],
    proposals: cancelPendingFor(s.proposals, (p) => p.credentialId === credentialId, now),
    audit: log(s, actor, `Credencial reemitida para ${old.participantId}`),
  };
  return { state, credential: fresh };
}

export function activateCredential(s: State, code: string, activationCode: string, pin: string): State {
  const cred = s.credentials.find((c) => c.code === code.trim().toUpperCase());
  if (!cred || cred.status !== "ativa") throw new DomainError("Credencial inválida.");
  if (!cred.activationCode || cred.activationCode !== activationCode.trim())
    throw new DomainError("Código de ativação inválido ou já utilizado.");
  if (!/^\d{4,6}$/.test(pin)) throw new DomainError("O PIN deve ter de 4 a 6 dígitos.");
  return {
    ...s,
    credentials: s.credentials.map((c) => (c.id === cred.id ? { ...c, pin, activationCode: undefined } : c)),
    audit: log(s, "cliente", `Acesso ativado para credencial ${cred.id}`),
  };
}

export function loginCredential(s: State, code: string, pin: string) {
  const cred = s.credentials.find((c) => c.code === code.trim().toUpperCase());
  if (!cred || cred.status !== "ativa" || !cred.pin || cred.pin !== pin)
    throw new DomainError("Credencial ou PIN incorretos.");
  return cred;
}

export function openStay(
  s: State,
  input: { type: StayType; room?: string; guests: GuestInput[]; medium: CredentialMedium },
  actor: string,
  now = Date.now(),
) {
  const guests = input.guests
    .map((g) => ({
      name: g.name.trim(),
      document: g.document?.trim() || undefined,
      phone: g.phone?.trim() || undefined,
    }))
    .filter((g) => g.name.length >= 2);
  if (guests.length === 0) throw new DomainError("Informe ao menos o responsável.");
  if (input.type === "hospedagem") {
    if (!input.room?.trim()) throw new DomainError("Hospedagem exige quarto.");
    if (s.stays.some((st) => st.room === input.room && st.status !== "encerrada"))
      throw new DomainError(`Quarto ${input.room} já possui permanência aberta.`);
  }
  const participants: Participant[] = guests.map((g) => ({
    id: uid("par"),
    name: g.name,
    ...(g.document ? { document: g.document } : {}),
    ...(g.phone ? { phone: g.phone } : {}),
  }));
  const stay: Stay = {
    id: uid("sty"),
    type: input.type,
    room: input.type === "hospedagem" ? input.room!.trim() : undefined,
    holderId: participants[0]!.id,
    participants,
    status: "aberta",
    openedAt: now,
  };
  const creds: Credential[] = participants.map((p) => ({
    id: uid("crd"),
    code: newCredentialCode(),
    stayId: stay.id,
    participantId: p.id,
    medium: input.medium,
    status: "ativa",
    activationCode: newActivationCode(),
    issuedAt: now,
  }));
  return {
    state: {
      ...s,
      stays: [stay, ...s.stays],
      credentials: [...creds, ...s.credentials],
      audit: log(s, actor, `Permanência aberta (${stay.room ?? "day use"})`),
    },
    stay,
    credentials: creds,
  };
}

/** Cadastro de demonstração: day use + credencial web (RF03 simplificado para testes). */
export function registerFictionalGuest(s: State, name: string, actor = "Cadastro fictício", now = Date.now()) {
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new DomainError("Informe seu nome completo.");
  return openStay(s, { type: "dayuse", guests: [{ name: trimmed }], medium: "celular" }, actor, now);
}

export function registerPayment(
  s: State,
  input: { stayId: string; amount: number; method: PaymentMethod },
  actor: string,
  now = Date.now(),
): State {
  const { due } = balance(s, input.stayId);
  if (input.amount <= 0) throw new DomainError("Valor inválido.");
  if (input.amount > due) throw new DomainError("Pagamento excede o saldo devedor.");
  return {
    ...s,
    payments: [{ id: uid("pay"), stayId: input.stayId, amount: input.amount, method: input.method, staff: actor, at: now }, ...s.payments],
    audit: log(s, actor, `Pagamento registrado`),
  };
}

export function reverseEntry(s: State, entryId: string, reason: string, actor: string, now = Date.now()): State {
  const e = s.entries.find((x) => x.id === entryId);
  if (!e || e.kind !== "debito") throw new DomainError("Lançamento inválido.");
  if (s.entries.some((x) => x.kind === "estorno" && x.proposalId === e.proposalId && x.description.includes(e.id)))
    throw new DomainError("Lançamento já estornado.");
  if (!reason.trim()) throw new DomainError("Informe o motivo do estorno.");
  const { due } = balance(s, e.stayId);
  if (e.amount > due) throw new DomainError("Estorno geraria saldo credor (expansão).");
  return {
    ...s,
    entries: [
      { id: uid("ent"), stayId: e.stayId, kind: "estorno", proposalId: e.proposalId, participantId: e.participantId, amount: e.amount, description: `Estorno de ${e.id}`, reason, author: actor, at: now },
      ...s.entries,
    ],
    audit: log(s, actor, `Estorno de ${e.id}: ${reason}`),
  };
}

export function closeStay(s: State, stayId: string, actor: string, now = Date.now()): State {
  const { due } = balance(s, stayId);
  if (due !== 0) throw new DomainError("A conta precisa ter saldo zero para ser encerrada.");
  return {
    ...s,
    stays: s.stays.map((st) => (st.id === stayId ? { ...st, status: "encerrada", closedAt: now } : st)),
    credentials: s.credentials.map((c) => (c.stayId === stayId && c.status === "ativa" ? { ...c, status: "revogada" } : c)),
    proposals: cancelPendingFor(s.proposals, (p) => p.stayId === stayId, now),
    audit: log(s, actor, `Conta ${stayId} encerrada`),
  };
}

export function setClosing(s: State, stayId: string, closing: boolean, actor: string, now = Date.now()): State {
  return {
    ...s,
    stays: s.stays.map((st) =>
      st.id === stayId && st.status !== "encerrada" ? { ...st, status: closing ? "em_fechamento" : "aberta" } : st,
    ),
    proposals: closing ? cancelPendingFor(s.proposals, (p) => p.stayId === stayId, now) : s.proposals,
    audit: log(s, actor, closing ? `Conta ${stayId} em fechamento` : `Conta ${stayId} reaberta`),
  };
}

export function toggleProduct(s: State, productId: string): State {
  return { ...s, products: s.products.map((p) => (p.id === productId ? { ...p, available: !p.available } : p)) };
}

export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
