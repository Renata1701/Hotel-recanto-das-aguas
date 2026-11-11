import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStaffSession, resolvePostLoginPath } from "@/lib/auth";

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
    const session = getStaffSession();
    if (session) {
      throw redirect({ to: resolvePostLoginPath(search.redirect, session) });
    }
    throw redirect({
      to: "/cliente/entrar",
      search: {
        ...(search.redirect ? { redirect: search.redirect } : {}),
        ...(search.codigo ? { codigo: search.codigo } : {}),
      },
    });
  },
  head: () => ({
    meta: [
      { title: "Área de Acesso · Recanto das Águas" },
      { name: "description", content: "Acesso da equipe ao sistema de comanda digital." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: () => null,
});
