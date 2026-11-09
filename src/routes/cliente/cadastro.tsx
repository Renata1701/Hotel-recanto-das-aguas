import { createFileRoute } from "@tanstack/react-router";
import { GuestRegisterForm } from "@/components/app/ClienteArea";

export const Route = createFileRoute("/cliente/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro fictício · Área do cliente" },
      { name: "description", content: "Demonstração: criar hóspede de teste com credencial e ativação." },
    ],
  }),
  component: GuestRegisterForm,
});
