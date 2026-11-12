import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ConciergeBell, MonitorSmartphone, ScanLine, UserPlus } from "lucide-react";
import heroLobby from "@/assets/hero-lobby.png";
import { StaffLayout } from "@/components/app/shared";
import { requireStaffAuth, useStaffSession } from "@/lib/auth";

export const Route = createFileRoute("/inicio")({
  beforeLoad: ({ location }) => requireStaffAuth(location.pathname),
  head: () => ({
    meta: [{ title: "Início · Recanto das Águas" }],
  }),
  component: InicioPage,
});

const areas = [
  {
    to: "/atendente",
    icon: ScanLine,
    label: "Atendente",
    title: "Catálogo e propostas",
    text: "Leia a credencial do hóspede, monte o pedido e envie a proposta para conferência no celular ou no terminal.",
  },
  {
    to: "/recepcao",
    search: { novo: true },
    icon: UserPlus,
    label: "Cliente",
    title: "Cadastro e estadia",
    text: "Registre o hóspede, escolha quarto e tipo de permanência — hospedagem ou day use.",
  },
  {
    to: "/terminal",
    icon: MonitorSmartphone,
    label: "Terminal",
    title: "Confirmação na pulseira",
    text: "Tela voltada ao hóspede: revisão do pedido e confirmação com PIN na pulseira.",
  },
  {
    to: "/recepcao",
    icon: ConciergeBell,
    label: "Recepção",
    title: "Contas e credenciais",
    text: "Abra e encerre permanências, emita credenciais, receba pagamentos e feche contas.",
  },
] as const;

function InicioPage() {
  const session = useStaffSession();
  const firstName = session?.name.split(/[\s(]/)[0] ?? "equipe";

  return (
    <StaffLayout>
      <div className="staff-home-bara min-h-full">
        <section className="relative isolate min-h-[min(78vh,44rem)] overflow-hidden">
          <img
            src={heroLobby}
            alt="Lobby do Hotel Recanto das Águas à noite"
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="staff-home-hero-overlay absolute inset-0" aria-hidden />
          <div className="relative mx-auto flex min-h-[min(78vh,44rem)] max-w-7xl flex-col justify-end px-5 pb-20 pt-28 sm:px-8 sm:pb-24">
            <p className="staff-home-eyebrow mb-6 text-white/80">Recanto das Águas</p>
            <h1 className="staff-home-title max-w-4xl text-white">
              <span className="block">Painel da equipe</span>
            </h1>
            <p className="mt-8 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">
              Operação de hospedagem, day use e comanda digital.
            </p>
          </div>
        </section>

        <section className="border-t border-stone-200/80 bg-white px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12 lg:gap-16 lg:items-end">
            <h2 className="staff-home-section-title lg:col-span-5">Bem-vindo</h2>
            <div className="space-y-4 text-[0.9375rem] leading-relaxed text-stone-600 lg:col-span-7">
              <p>
                Olá, <span className="font-semibold text-stone-800">{firstName}</span>. Escolha abaixo a área de
                trabalho.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 pt-4 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col gap-2 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="staff-home-eyebrow text-stone-500">Áreas de trabalho</p>
              </div>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:gap-8">
              {areas.map((a) => {
                const search = "search" in a ? a.search : undefined;
                return (
                  <li key={a.label}>
                    <Link
                      to={a.to}
                      {...(search ? { search } : {})}
                      className="staff-home-card group flex h-full min-h-[12.5rem] flex-col rounded-sm p-7 sm:p-8"
                    >
                      <span className="mb-6 flex items-center justify-between gap-4">
                        <span className="grid size-10 place-items-center rounded-full border border-stone-200 text-stone-700 transition-colors group-hover:border-primary/30 group-hover:text-primary">
                          <a.icon className="size-[1.125rem] stroke-[1.35]" aria-hidden />
                        </span>
                        <span className="staff-home-eyebrow text-stone-400">{a.label}</span>
                      </span>
                      <h3 className="staff-home-card-title text-stone-900">{a.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-600">{a.text}</p>
                      <span className="staff-home-card-cta mt-8 inline-flex items-center gap-2">
                        Acessar
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

      </div>
    </StaffLayout>
  );
}
