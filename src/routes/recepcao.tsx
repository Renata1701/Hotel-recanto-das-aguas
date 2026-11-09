import { createFileRoute } from "@tanstack/react-router";
import { AppHeader, Panel } from "@/components/app/shared";

export const Route = createFileRoute("/recepcao")({
  head: () => ({
    meta: [
      { title: "Recepção · Recanto das Águas" },
      { name: "description", content: "Área Recepção do consumo digital do Hotel Recanto das Águas." },
      { property: "og:title", content: "Recepção · Recanto das Águas" },
      { property: "og:description", content: "Área Recepção do consumo digital." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen">
      <AppHeader subtitle="Recepção" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Panel title="Recepção">
          <p className="text-sm text-muted-foreground">Esta área ainda está em construção.</p>
        </Panel>
      </main>
    </div>
  );
}
