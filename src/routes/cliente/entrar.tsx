import { createFileRoute } from "@tanstack/react-router";
import { GuestEnterForm } from "@/components/app/ClienteArea";

type Search = { codigo?: string };

export const Route = createFileRoute("/cliente/entrar")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    codigo: typeof search.codigo === "string" ? search.codigo.trim().toUpperCase() : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar · Área do cliente" },
      { name: "description", content: "Acesso do hóspede com credencial e PIN — sem aplicativo." },
    ],
  }),
  component: Page,
});

function Page() {
  const { codigo } = Route.useSearch();
  return <GuestEnterForm initialCode={codigo ?? ""} />;
}
