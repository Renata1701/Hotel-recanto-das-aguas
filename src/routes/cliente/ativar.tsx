import { createFileRoute } from "@tanstack/react-router";
import { GuestActivateForm } from "@/components/app/ClienteArea";

type Search = { codigo?: string | undefined };

export const Route = createFileRoute("/cliente/ativar")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const raw = search["codigo"];
    return { codigo: typeof raw === "string" ? raw.trim().toUpperCase() : undefined };
  },
  head: () => ({
    meta: [
      { title: "Ativar acesso · Área do cliente" },
      { name: "description", content: "Primeiro acesso do hóspede com código de ativação da recepção." },
    ],
  }),
  component: Page,
});

function Page() {
  const { codigo } = Route.useSearch();
  return <GuestActivateForm initialCode={codigo ?? ""} />;
}
