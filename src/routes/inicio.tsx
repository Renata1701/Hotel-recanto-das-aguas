import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ConciergeBell, MonitorSmartphone, ScanLine, Smartphone, Waves } from "lucide-react";
import hero from "@/assets/hero-pool.jpg";
import { AppHeader } from "@/components/app/shared";
import { getStaffSession } from "@/lib/auth";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/inicio")({
  beforeLoad: ({ location }) => {
    if (!getStaffSession()) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  head: () => ({
    meta: [{ title: "Início · Recanto das Águas" }],
  }),
  component: InicioPage,
});

const areas = [
  { to: "/atendente", icon: ScanLine, title: "Atendente", text: "Catálogo, leitura da credencial e envio da proposta para o cliente conferir." },
  { to: "/cliente/entrar", icon: Smartphone, title: "Cliente", text: "Entrar ou ativar acesso no navegador — sem app." },
  { to: "/terminal", icon: MonitorSmartphone, title: "Terminal", text: "Tela voltada ao hóspede de pulseira: confere o pedido e confirma com PIN." },
  { to: "/recepcao", icon: ConciergeBell, title: "Recepção", text: "Abrir permanências, emitir credenciais, receber pagamentos e encerrar contas." },
] as const;

function InicioPage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <section className="relative isolate overflow-hidden">
        <img
          src={hero}
          alt="Piscina do Hotel Recanto das Águas ao entardecer"
          width={1600}
          height={1008}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="mx-auto flex min-h-[52vh] max-w-7xl flex-col justify-end px-4 pb-14 pt-24 sm:px-6">
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground/90">
            <Waves className="size-3.5" aria-hidden />
            Hospedagem &amp; Day use
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-primary-foreground sm:text-6xl">
            Painel da equipe
          </h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/90">
            O hóspede usa{" "}
            <Link to="/cliente/entrar" className="underline">
              /cliente/entrar
            </Link>{" "}
            ou QR{" "}
            <Link to="/acesso" search={{ codigo: "RDA-R4F4-208A" }} className="underline">
              /acesso
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {areas.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="group relative flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-lift"
          >
            <span className="mb-10 grid size-11 place-items-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-primary-foreground">
              <a.icon className="size-5" />
            </span>
            <h2 className="text-2xl font-semibold">{a.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{a.text}</p>
            <ArrowUpRight className="absolute right-5 top-5 size-5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl border border-dashed border-primary/20 bg-card p-6 text-sm shadow-soft">
          <p className="font-semibold text-primary">Demonstração UC01</p>
          <p className="mt-1 text-muted-foreground">
            Hóspede em <Link to="/cliente/entrar" className="font-medium text-primary hover:underline">/cliente/entrar</Link> (
            <code className="font-mono">RDA-R4F4-208A</code> + PIN <code className="font-mono">1234</code>). Pulseira:{" "}
            <Link to="/terminal" className="font-medium text-primary hover:underline">/terminal</Link>. Ativar Clara:{" "}
            <code className="font-mono">RDA-CL4R-208C</code> + <code className="font-mono">482913</code>.
          </p>
        </div>
      </section>
    </div>
  );
}
