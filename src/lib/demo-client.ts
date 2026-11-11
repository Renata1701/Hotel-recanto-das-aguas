/** Hóspede fixo nos dados iniciais — útil para testar login sem passar pela recepção. */
export const FICTIONAL_DEMO_GUEST = {
  name: "Cliente Fictício",
  credential: "RDA-F1CT-DEMO",
  pin: "5678",
} as const;

/** Conta de demonstração para Renata — PIN já ativo (login direto em /cliente/entrar). */
export const RENATA_DEMO_GUEST = {
  name: "Renata",
  credential: "RDA-R3N4-210A",
  pin: "2026",
  room: "210",
} as const;
