import { createFileRoute, redirect } from "@tanstack/react-router";

/** Entrada do sistema: sempre começa na tela de login (RF01). */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/cliente/entrar" });
  },
  component: () => null,
});
