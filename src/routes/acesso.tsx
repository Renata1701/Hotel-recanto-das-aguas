import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { useSyncExternalStore } from "react";

import { GuestActivationSuccess, GuestActivateForm, ClientGuestShell } from "@/components/app/ClienteArea";

import { Panel } from "@/components/app/shared";

import { Button } from "@/components/ui/button";

import { normalizeCredentialCode } from "@/lib/guest-access-url";

import { useStore } from "@/lib/store";



type Search = { codigo?: string; sucesso?: string | boolean };



/** QR ou link de acesso — permanece nesta rota (evita tela branca). */

export const Route = createFileRoute("/acesso")({

  validateSearch: (search: Record<string, unknown>): Search => ({

    codigo: typeof search.codigo === "string" ? normalizeCredentialCode(search.codigo) : undefined,

    sucesso: search.sucesso === "1" || search.sucesso === 1 || search.sucesso === true,

  }),

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

          <p className="text-sm text-muted-foreground">Escaneie o QR da recepção ou use o link completo com o código.</p>

          <Button asChild className="mt-4 h-11 w-full">

            <Link to="/cliente/entrar">Entrar manualmente</Link>

          </Button>

        </Panel>

      </ClientGuestShell>

    );

  }



  const alreadyActive = Boolean(cred?.pin && cred.status === "ativa");

  if (sucesso || alreadyActive) {

    return <GuestActivationSuccess code={codigo} />;

  }



  const needsActivate = Boolean(cred?.activationCode && !cred.pin);

  const showActivate = needsActivate || !cred;



  if (showActivate) {

    return (

      <GuestActivateForm

        initialCode={codigo}

        onSuccess={() => {

          void navigate({ to: "/acesso", search: { codigo, sucesso: "1" }, replace: true });

        }}

      />

    );

  }



  return <GuestActivationSuccess code={codigo} />;

}


