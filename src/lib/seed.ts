import type { Product, State } from "./domain";
import { FICTIONAL_DEMO_GUEST } from "./demo-client";

const products: Product[] = [
  { id: "p1", name: "Cerveja long neck", category: "Bebidas", description: "Pilsen 355 ml, bem gelada", price: 1400, available: true },
  { id: "p2", name: "Água de coco", category: "Bebidas", description: "Natural, servida no coco", price: 1200, available: true },
  { id: "p3", name: "Refrigerante lata", category: "Bebidas", description: "350 ml, diversos sabores", price: 800, available: true },
  { id: "p4", name: "Suco natural", category: "Bebidas", description: "Laranja, abacaxi ou maracujá", price: 1300, available: true },
  { id: "p5", name: "Água mineral", category: "Bebidas", description: "500 ml com ou sem gás", price: 600, available: true },
  { id: "p6", name: "Caipirinha", category: "Drinks", description: "Cachaça artesanal e limão", price: 2600, available: true },
  { id: "p7", name: "Piña colada", category: "Drinks", description: "Rum, coco e abacaxi", price: 3200, available: true },
  { id: "p8", name: "Mojito", category: "Drinks", description: "Hortelã fresca e rum branco", price: 2900, available: false },
  { id: "p9", name: "Batata frita", category: "Porções", description: "500 g com páprica defumada", price: 3800, available: true },
  { id: "p10", name: "Isca de tilápia", category: "Porções", description: "Empanada, molho tártaro", price: 5600, available: true },
  { id: "p11", name: "Mandioca frita", category: "Porções", description: "Crocante com manteiga de garrafa", price: 3400, available: true },
  { id: "p12", name: "Filé à parmegiana", category: "Pratos", description: "Arroz, fritas e salada", price: 7900, available: true },
  { id: "p13", name: "Moqueca capixaba", category: "Pratos", description: "Para dois, com pirão", price: 13800, available: true },
  { id: "p14", name: "Salada tropical", category: "Pratos", description: "Folhas, manga e castanhas", price: 4200, available: true },
  { id: "p15", name: "Açaí 500 ml", category: "Sobremesas", description: "Banana, granola e mel", price: 2400, available: true },
  { id: "p16", name: "Pudim de leite", category: "Sobremesas", description: "Receita da casa", price: 1600, available: false },
];

export function seedState(): State {
  const t = Date.UTC(2026, 10, 7, 13, 0);
  return {
    products,
    stays: [
      {
        id: "sty_208",
        type: "hospedagem",
        room: "208",
        holderId: "par_rafael",
        status: "aberta",
        openedAt: t,
        participants: [
          { id: "par_rafael", name: "Rafael Souza" },
          { id: "par_ana", name: "Ana Souza" },
          { id: "par_clara", name: "Clara Souza" },
        ],
      },
      {
        id: "sty_203",
        type: "hospedagem",
        room: "203",
        holderId: "par_joao",
        status: "aberta",
        openedAt: t,
        participants: [{ id: "par_joao", name: "João Pereira" }],
      },
      {
        id: "sty_du1",
        type: "dayuse",
        holderId: "par_marina",
        status: "aberta",
        openedAt: t,
        participants: [{ id: "par_marina", name: "Marina Lima" }],
      },
      {
        id: "sty_fict",
        type: "dayuse",
        holderId: "par_fict",
        status: "aberta",
        openedAt: t,
        participants: [{ id: "par_fict", name: FICTIONAL_DEMO_GUEST.name }],
      },
    ],
    credentials: [
      { id: "crd_rafael", code: "RDA-R4F4-208A", stayId: "sty_208", participantId: "par_rafael", medium: "celular", status: "ativa", pin: "1234", issuedAt: t },
      { id: "crd_ana", code: "RDA-AN4S-208B", stayId: "sty_208", participantId: "par_ana", medium: "pulseira", status: "ativa", pin: "1234", issuedAt: t },
      { id: "crd_clara", code: "RDA-CL4R-208C", stayId: "sty_208", participantId: "par_clara", medium: "pulseira", status: "ativa", activationCode: "482913", issuedAt: t },
      { id: "crd_joao", code: "RDA-J04O-203A", stayId: "sty_203", participantId: "par_joao", medium: "celular", status: "ativa", pin: "1234", issuedAt: t },
      { id: "crd_marina", code: "RDA-M4R1-DU01", stayId: "sty_du1", participantId: "par_marina", medium: "pulseira", status: "ativa", pin: "1234", issuedAt: t },
      {
        id: "crd_fict",
        code: FICTIONAL_DEMO_GUEST.credential,
        stayId: "sty_fict",
        participantId: "par_fict",
        medium: "celular",
        status: "ativa",
        pin: FICTIONAL_DEMO_GUEST.pin,
        issuedAt: t,
      },
    ],
    proposals: [],
    entries: [
      { id: "ent_seed1", stayId: "sty_208", kind: "debito", participantId: "par_rafael", amount: 5600, description: "Bar da Piscina · 4× Cerveja long neck", author: "Lucas (bar)", at: t + 3600e3 },
      { id: "ent_seed2", stayId: "sty_208", kind: "debito", participantId: "par_clara", amount: 2400, description: "Lanchonete · 1× Açaí 500 ml", author: "Bia (lanchonete)", at: t + 5400e3 },
    ],
    payments: [],
    audit: [],
  };
}
