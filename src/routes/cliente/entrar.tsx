import { createFileRoute, redirect } from "@tanstack/react-router";
import { GuestEnterForm } from "@/components/app/ClienteArea";
import { getStaffSession, resolvePostLoginPath } from "@/lib/auth";
import { getGuestSession } from "@/lib/client-session";

type Search = { codigo?: string; redirect?: string; qr?: string | boolean };

const guestCredPattern = /^RDA-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export const Route = createFileRoute("/cliente/entrar")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    codigo: typeof search.codigo === "string" ? search.codigo.trim().toUpperCase() : undefined,
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    qr: search.qr === "1" || search.qr === 1 || search.qr === true ? "1" : undefined,
  }),
  beforeLoad: ({ search }) => {
    const staff = getStaffSession();
    if (staff) {
      throw redirect({ to: resolvePostLoginPath(search.redirect, staff) });
    }
    const guest = getGuestSession();
    const fromQr = Boolean(search.qr || (search.codigo && guestCredPattern.test(search.codigo)));
    if (guest && !fromQr) {
      throw redirect({ to: "/cliente" });
    }
  },
  head: () => ({
    meta: [
      { title: "Área de Acesso · Recanto das Águas" },
      { name: "description", content: "Hóspede: credencial e PIN. Equipe: usuário e senha." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { codigo, redirect: redirectPath, qr } = Route.useSearch();
  const lockCredential = Boolean(qr || (codigo && guestCredPattern.test(codigo)));
  return (
    <GuestEnterForm
      initialCode={codigo ?? ""}
      lockCredential={lockCredential}
      staffRedirect={redirectPath}
    />
  );
}
