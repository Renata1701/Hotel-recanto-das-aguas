import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { GuestHome } from "@/components/app/ClienteArea";
import { useGuestSession } from "@/lib/client-session";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/cliente")({
  component: ClienteLayout,
});

function ClienteLayout() {
  const guest = useGuestSession();
  const state = useStore((s) => s);

  if (guest) return <GuestHome guest={guest} state={state} />;
  return <Outlet />;
}
