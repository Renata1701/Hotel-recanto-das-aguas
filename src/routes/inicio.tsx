import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ConciergeBell, MonitorSmartphone, ScanLine, UserPlus } from "lucide-react";
import heroCafe from "@/assets/hero-cafe-manha.png";
import heroLobby from "@/assets/hero-lobby.png";
import heroPool from "@/assets/hero-pool.jpg";
import heroRestaurant from "@/assets/hero-restaurant.png";
import { StaffLayout } from "@/components/app/shared";
import { requireStaffAuth, useStaffSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const hotelChalet = "/gallery/hotel-chalet.svg";
const hotelWellness = "/gallery/hotel-wellness.svg";

export const Route = createFileRoute("/inicio")({
  beforeLoad: ({ location }) => requireStaffAuth(location.pathname),
  head: () => ({
    meta: [{ title: "Início · Recanto das Águas" }],
  }),
  component: InicioPage,
});

const editorialBlocks = [
  {
    title: "Café da Manhã",
    lead: "Sabores que acolhem. Experiências que permanecem.",
    text: "No Recanto das Águas, o café da manhã acontece sem pressa: frutas da estação, bolos da casa, sucos e receitas regionais. Na operação digital, os pedidos do período seguem pelo mesmo catálogo do bar e restaurante.",
    image: heroCafe,
    alt: "Café da manhã no Recanto das Águas — foto fictícia de demonstração",
    objectPosition: "center center",
    reverse: false,
    cta: { label: "Cardápio", to: "/atendente" as const },
  },
  {
    title: "Almoço & Jantar",
    lead: "Gastronomia à beira das águas.",
    text: "O Restaurante Fluvial valoriza ingredientes frescos e a hospitalidade do litoral. O atendente registra consumos e envia propostas para o hóspede confirmar no celular ou no terminal.",
    image: heroRestaurant,
    alt: "Restaurante Fluvial — foto fictícia de demonstração",
    objectPosition: "center 42%",
    reverse: true,
    cta: { label: "Atendimento", to: "/atendente" as const },
  },
  {
    title: "Águas & Experiências",
    lead: "Natureza, piscina e day use.",
    text: "Hospedagem ou permanência diária: a recepção cadastra o hóspede, emite credencial e PIN; o saldo e os pedidos ficam visíveis na área do cliente.",
    image: heroPool,
    alt: "Piscina e águas — foto fictícia de demonstração",
    objectPosition: "center center",
    reverse: false,
    cta: { label: "Recepção", to: "/recepcao" as const },
  },
] as const;

const areas = [
  {
    to: "/atendente",
    icon: ScanLine,
    label: "Atendente",
    title: "Catálogo e propostas",
    text: "Leia a credencial, monte o pedido e envie a proposta.",
  },
  {
    to: "/recepcao",
    search: { novo: true },
    icon: UserPlus,
    label: "Cliente",
    title: "Cadastro e estadia",
    text: "Registre o hóspede, quarto e permanência.",
  },
  {
    to: "/terminal",
    icon: MonitorSmartphone,
    label: "Terminal",
    title: "Confirmação na pulseira",
    text: "Revisão do pedido e confirmação com PIN.",
  },
  {
    to: "/recepcao",
    icon: ConciergeBell,
    label: "Recepção",
    title: "Contas e credenciais",
    text: "Estadias, credenciais, pagamentos e contas.",
  },
] as const;

const hotelGallery = [
  {
    src: heroLobby,
    alt: "Lobby do Recanto das Águas (foto fictícia)",
    title: "Lobby",
    subtitle: "Recepção",
  },
  {
    src: hotelChalet,
    alt: "Acomodações — ilustração fictícia",
    title: "Acomodações",
    subtitle: "Conforto",
  },
  {
    src: hotelWellness,
    alt: "Wellness — ilustração fictícia",
    title: "Wellness",
    subtitle: "Descanso",
  },
] as const;

function InicioPage() {
  const session = useStaffSession();
  const firstName = session?.name.split(/[\s(]/)[0] ?? "equipe";

  return (
    <StaffLayout subtitle="Painel da equipe" scrollMain>
      <div className="staff-home-bara">
        <section className="relative isolate min-h-[min(44vh,22rem)] overflow-hidden sm:min-h-[min(48vh,24rem)]">
          <img
            src={heroLobby}
            alt="Lobby do Hotel Recanto das Águas"
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="staff-home-hero-overlay absolute inset-0" aria-hidden />
          <div className="relative mx-auto flex min-h-[min(44vh,22rem)] max-w-7xl flex-col justify-end px-5 pb-10 pt-16 sm:min-h-[min(48vh,24rem)] sm:px-8 sm:pb-12">
            <p className="staff-home-eyebrow mb-2 text-white/80">Recanto das Águas</p>
            <p className="staff-home-tagline mb-3">Charme — Gastronomia — Experiências</p>
            <h1 className="staff-home-title max-w-4xl text-[clamp(2.2rem,5vw,3.5rem)] text-white">Painel da equipe</h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/88 sm:text-base">
              Olá, <span className="font-semibold text-white">{firstName}</span>. Bem-vindo à operação do resort.
            </p>
          </div>
        </section>

        {editorialBlocks.map((block) => (
          <EditorialSplit key={block.title} {...block} />
        ))}

        <section className="border-y border-[#d9ddd4] bg-[#faf8f4] px-5 py-12 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="staff-home-eyebrow text-muted-foreground">Sobre o resort</p>
            <h2 className="staff-home-section-title mt-3 text-foreground">Demonstração acadêmica</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Layout inspirado em pousadas de charme. Fotos e textos são fictícios; o foco desta tela é orientar a equipe
              nas áreas do sistema.
            </p>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-7xl">
            <p className="staff-home-eyebrow text-muted-foreground">Galeria</p>
            <h2 className="staff-home-section-title mt-2 text-foreground">Mais ambientes</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {hotelGallery.map((shot) => (
                <li key={shot.title} className="group overflow-hidden rounded-sm border border-[#d9ddd4] bg-card shadow-soft">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={shot.src}
                      alt={shot.alt}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a2f27]/45 via-transparent to-transparent"
                      aria-hidden
                    />
                  </div>
                  <div className="border-t border-border/80 px-4 py-3">
                    <p className="staff-home-eyebrow text-[0.6rem] text-muted-foreground">{shot.subtitle}</p>
                    <h3 className="staff-home-card-title mt-1 text-lg text-foreground">{shot.title}</h3>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-[#d9ddd4] bg-[#faf8f4] px-5 py-12 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-7xl">
            <p className="staff-home-eyebrow mb-3 text-[var(--bara-muted)]">Áreas de trabalho</p>
            <h2 className="staff-home-section-title mb-8 text-foreground">Escolha onde atuar</h2>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {areas.map((a) => {
                const search = "search" in a ? a.search : undefined;
                return (
                  <li key={a.label}>
                    <Link
                      to={a.to}
                      {...(search ? { search } : {})}
                      className="staff-home-card group flex h-full min-h-[11rem] flex-col rounded-sm p-6 sm:p-7"
                    >
                      <span className="mb-4 flex items-center justify-between gap-2">
                        <span className="grid size-10 place-items-center rounded-full border border-[#d9ddd4] text-primary transition-colors group-hover:border-accent/50 group-hover:text-accent">
                          <a.icon className="size-4 stroke-[1.35]" aria-hidden />
                        </span>
                        <span className="staff-home-eyebrow text-[0.6rem] text-muted-foreground">{a.label}</span>
                      </span>
                      <h3 className="staff-home-card-title text-xl text-foreground">{a.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{a.text}</p>
                      <span className="staff-home-card-cta mt-6 inline-flex items-center gap-2">
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

function EditorialSplit({
  title,
  lead,
  text,
  image,
  alt,
  objectPosition,
  reverse,
  cta,
}: (typeof editorialBlocks)[number]) {
  return (
    <section className={cn("staff-home-split border-t border-[#d9ddd4]", reverse && "staff-home-split--reverse")}>
      <div className="staff-home-split__media">
        <img src={image} alt={alt} style={{ objectPosition }} loading="lazy" />
      </div>
      <div className="staff-home-split__body">
        <h2 className="staff-home-split__kicker">{title}</h2>
        <p className="staff-home-split__lead">{lead}</p>
        <p className="staff-home-split__text">{text}</p>
        <Link to={cta.to} className="staff-home-menu-btn">
          {cta.label}
        </Link>
      </div>
    </section>
  );
}
