import { createFileRoute } from "@tanstack/react-router";
import { AppHeader, Panel } from "@/components/app/shared";

export const Route = createFileRoute("/terminal")({
  head: () => ({
    meta: [
      { title: "Terminal · Recanto das Águas" },
      { name: "description", content: "Área Terminal do consumo digital do Hotel Recanto das Águas." },
      { property: "og:title", content: "Terminal · Recanto das Águas" },
      { property: "og:description", content: "Área Terminal do consumo digital." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen">
      <AppHeader subtitle="Terminal" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Panel title="Terminal">
          <p className="text-sm text-muted-foreground">Esta área ainda está em construção.</p>
        </Panel>
      </main>
    </div>
  );
}
