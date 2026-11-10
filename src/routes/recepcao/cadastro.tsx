import { createFileRoute } from "@tanstack/react-router";
import { ReceptionCheckIn } from "@/components/app/ReceptionCheckIn";
import { StaffLayout } from "@/components/app/shared";
import { requireStaffAuth, useStaffSession } from "@/lib/auth";

export const Route = createFileRoute("/recepcao/cadastro")({
  beforeLoad: ({ location }) => requireStaffAuth(location.pathname),
  head: () => ({
    meta: [
      { title: "Check-in · Recepção" },
      { name: "description", content: "Cadastro de cliente, seleção de quarto e tipo de permanência." },
    ],
  }),
  component: CheckInPage,
});

function CheckInPage() {
  const session = useStaffSession();
  const actor = session?.name ?? "Recepção";

  return (
    <StaffLayout subtitle="Check-in / cadastro">
      <ReceptionCheckIn actor={actor} />
    </StaffLayout>
  );
}
