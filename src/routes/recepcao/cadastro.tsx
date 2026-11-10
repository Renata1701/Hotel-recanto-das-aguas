import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireStaffAuth } from "@/lib/auth";

export const Route = createFileRoute("/recepcao/cadastro")({
  beforeLoad: ({ location }) => {
    requireStaffAuth(location.pathname);
    throw redirect({ to: "/recepcao", search: { novo: true } });
  },
  component: () => null,
});
