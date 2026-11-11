import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { GuestActivationSuccess, GuestActivateForm, GuestEnterForm, ClientGuestShell } from "@/components/app/ClienteArea";
import { Panel } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { normalizeCredentialCode } from "@/lib/guest-access-url";
import { useStore } from "@/lib/store";

type Search = { codigo?: string | undefined; sucesso?: string | boolean | undefined };

/** QR ou link de acesso — tela mobile para token (ativação ou PIN). */
export const Route = createFileRoute("/acesso")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const raw = search["codigo"];
    const sucesso = search["sucesso"];
    return {
      codigo: typeof raw === "string" ? normalizeCredentialCode(raw) : undefined,
      sucesso: sucesso === "1" || sucesso === 1 || sucesso === true,
    };
  },
  head: () => ({
    meta: [{ title: "Acesso · Recanto das Águas" }],
  }),
  component: AcessoPage,
});

function AcessoPage() {
  const navigate = useNavigate();
  const { codigo, sucesso } = Route.useSearch();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const cred = useStore((s) => (codigo ? s.credentials.find((c) => c.code === codigo) : undefined));

  if (!hydrated) {
    return (
      <ClientGuestShell title="Acesso pelo QR">
        <Panel>
          <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
        </Panel>
      </ClientGuestShell>
    );
  }

  if (!codigo) {
    return (
      <ClientGuestShell title="Acesso pelo QR">
        <Panel title="Credencial não informada">
          <p className="text-sm text-muted-foreground">Escaneie o QR exibido no terminal ou na recepção.</p>
          <Button asChild className="mt-4 h-11 w-full">
            <Link to="/cliente/entrar">Entrar manualmente</Link>
          </Button>
        </Panel>
      </ClientGuestShell>
    );
  }

  if (sucesso) {
    return <GuestActivationSuccess code={codigo} />;
  }

  if (!cred) {
    return (
      <ClientGuestShell title="Acesso pelo QR">
        <Panel title="Credencial não encontrada">
          <p className="font-mono text-sm text-foreground">{codigo}</p>
          <p className="mt-2 text-sm text-muted-foreground">Confira o QR ou peça uma nova credencial na recepção.</p>
          <Button asChild className="mt-4 h-11 w-full">
            <Link to="/cliente/entrar" search={{ codigo }}>
              Digitar manualmente
            </Link>
          </Button>
        </Panel>
      </ClientGuestShell>
    );
  }

  if (cred.pin && cred.status === "ativa") {
    return <GuestEnterForm initialCode={codigo} lockCredential />;
  }

  if (cred.activationCode && !cred.pin) {
    return (
      <GuestActivateForm
        initialCode={codigo}
        fromQr
        onSuccess={() => {
          void navigate({ to: "/acesso", search: { codigo, sucesso: "1" }, replace: true });
        }}
      />
    );
  }

  return (
    <GuestActivateForm
      initialCode={codigo}
      fromQr
      onSuccess={() => {
        void navigate({ to: "/acesso", search: { codigo, sucesso: "1" }, replace: true });
      }}
    />
  );
}
