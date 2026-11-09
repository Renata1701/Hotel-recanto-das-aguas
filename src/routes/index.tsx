import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ConciergeBell, MonitorSmartphone, ScanLine, Smartphone } from "lucide-react";
import hero from "@/assets/hero-pool.jpg";
import { AppHeader } from "@/components/app/shared";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recanto das Águas · Comanda digital" },
      { name: "description", content: "Consumo digital confirmado pelo cliente para hospedagem e day use no Hotel Recanto das Águas." },
      { property: "og:title", content: "Recanto das Águas · Comanda digital" },
      { property: "og:description", content: "Adeus comanda de papel: cada pedido é conferido e confirmado pelo hóspede." },
    ],
  }),
  component: Index,
});

const areas = [
  { to: "/atendente", icon: ScanLine, title: "Atendente", text: "Catálogo, leitura da credencial e envio da proposta para o cliente conferir." },
  { to: "/cliente", icon: Smartphone, title: "Cliente", text: "Área no navegador para confirmar pedidos e acompanhar o extrato. Sem app." },
  { to: "/terminal", icon: MonitorSmartphone, title: "Terminal", text: "Tela voltada ao hóspede de pulseira: confere o pedido e confirma com PIN." },
  { to: "/recepcao", icon: ConciergeBell, title: "Recepção", text: "Abrir permanências, emitir credenciais, receber pagamentos e encerrar contas." },
] as const;

function Index() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <section className="relative isolate overflow-hidden">
        <img src={hero} alt="Piscina do Hotel Recanto das Águas ao entardecer" width={1600} height={1008} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-dusk" />
        <div className="mx-auto flex min-h-[62vh] max-w-7xl flex-col justify-end px-4 pb-14 pt-32 sm:px-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-primary-foreground/80">Hospedagem & Day use</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] text-primary-foreground sm:text-7xl">
            A comanda agora <em className="font-medium text-sand">não molha</em> nem se perde.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-primary-foreground/85">
            Cada pedido é conferido e confirmado pelo próprio hóspede antes de entrar na conta.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {areas.map((a) => (
          <Link key={a.to} to={a.to} className="group relative flex flex-col rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
            <span className="mb-10 grid size-11 place-items-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-lagoon-gradient group-hover:text-primary-foreground">
              <a.icon className="size-5" />
            </span>
            <h2 className="text-2xl font-semibold">{a.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{a.text}</p>
            <ArrowUpRight className="absolute right-5 top-5 size-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl border border-dashed bg-secondary/50 p-6 text-sm">
          <p className="font-semibold">Dica para a demonstração</p>
          <p className="mt-1 text-muted-foreground">
            Abra <b>Atendente</b> e <b>Cliente</b> em abas lado a lado: tudo sincroniza na hora. Rafael (quarto 208) entra com
            a credencial <code className="font-mono text-foreground">RDA-R4F4-208A</code> e PIN <code className="font-mono text-foreground">1234</code>.
          </p>
        </div>
      </section>
    </div>
  );
}
