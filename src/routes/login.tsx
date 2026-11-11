import { createFileRoute, redirect } from "@tanstack/react-router";

type LoginSearch = {
  redirect?: string;
  tipo?: "equipe" | "hospede";
  codigo?: string;
};

/** Legado: uma única tela de acesso em /cliente/entrar. */
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    codigo: typeof search.codigo === "string" ? search.codigo.trim().toUpperCase() : undefined,
    ...(search.tipo === "hospede" || search.tipo === "equipe" ? { tipo: search.tipo } : {}),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/cliente/entrar",
      search: {
        ...(search.redirect ? { redirect: search.redirect } : {}),
        ...(search.codigo ? { codigo: search.codigo } : {}),
      },
    });
  },
  component: () => null,
});
