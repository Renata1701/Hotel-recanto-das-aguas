import { describe, expect, it } from "vitest";
import { createProposal, credentialQuickPicks, loginCredential, resolveProposal } from "@/lib/domain";
import { seedState as seed } from "@/lib/seed";

describe("UC01 — confirmação só pelo cliente", () => {
  it("nega confirmação quando credentialId da sessão não corresponde", () => {
    let s = seed();
    const op = "op-test-1";
    const created = createProposal(s, {
      credentialCode: "RDA-R4F4-208A",
      sector: "Bar da Piscina",
      attendant: "Lucas (bar)",
      operationId: op,
      items: [{ productId: "p1", qty: 1 }],
    });
    s = created.state;
    expect(() =>
      resolveProposal(s, {
        proposalId: created.proposal.id,
        decision: "confirmar",
        via: "sessao",
        credentialId: "crd_ana",
      }),
    ).toThrow(/não pertence/);
  });

  it("confirma com sessão autenticada do titular", () => {
    let s = seed();
    const created = createProposal(s, {
      credentialCode: "RDA-R4F4-208A",
      sector: "Bar da Piscina",
      attendant: "Lucas (bar)",
      operationId: "op-test-2",
      items: [{ productId: "p1", qty: 2 }],
    });
    s = created.state;
    const cred = loginCredential(s, "RDA-R4F4-208A", "1234");
    const next = resolveProposal(s, {
      proposalId: created.proposal.id,
      decision: "confirmar",
      via: "sessao",
      credentialId: cred.id,
    });
    expect(next.entries.some((e) => e.proposalId === created.proposal.id)).toBe(true);
  });
});

describe("credenciais no leitor", () => {
  it("lista todos os hóspedes ativos do seed", () => {
    const picks = credentialQuickPicks(seed());
    expect(picks.length).toBeGreaterThanOrEqual(4);
    expect(picks.some((p) => p.code === "RDA-R4F4-208A")).toBe(true);
  });
});
