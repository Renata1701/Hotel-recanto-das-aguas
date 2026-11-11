import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { GuestHome } from "@/components/app/ClienteArea";
import { getGuestSession, useGuestSession } from "@/lib/client-session";
import { useStore } from "@/lib/store";

const PUBLIC_GUEST_PATHS = ["/cliente/entrar", "/cliente/ativar", "/cliente/cadastro"] as const;

export const Route = createFileRoute("/cliente")({
  beforeLoad: ({ location }) => {
    const path = location.pathname.replace(/\/$/, "") || "/cliente";
    if (PUBLIC_GUEST_PATHS.includes(path as (typeof PUBLIC_GUEST_PATHS)[number])) return;
    if (!getGuestSession()) {
      throw redirect({
        to: "/cliente/entrar",
        search: path !== "/cliente" ? { redirect: path } : undefined,
      });
    }
  },
  component: ClienteLayout,
});

function ClienteLayout() {
  const guest = useGuestSession();
  const state = useStore((s) => s);

  if (guest) return <GuestHome guest={guest} state={state} />;
  return <Outlet />;
}
