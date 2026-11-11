import { describe, expect, it } from "vitest";
import { migrateCatalog } from "@/lib/catalog-migration";
import { productsInSector, createProposal, type State } from "@/lib/domain";
import { seedState } from "@/lib/seed";

describe("Legacy catalog restoration", () => {
  const legacy = (): State => JSON.parse(JSON.stringify(seedState()), (key, value) => key === "sector" ? undefined : value);

  it("restores products in all three sectors", () => {
    const migrated = migrateCatalog(legacy());
    expect(productsInSector(migrated.products, "Bar da Piscina").some(p => p.id === "p1")).toBe(true);
    expect(productsInSector(migrated.products, "Restaurante").some(p => p.id === "p12")).toBe(true);
    expect(productsInSector(migrated.products, "Lanchonete").some(p => p.id === "p3")).toBe(true);
  });

  it("preserves orders, accounts and product availability", () => {
    const saved = legacy();
    const order = createProposal(seedState(), {
      credentialCode: "RDA-R4F4-208A", sector: "Bar da Piscina", attendant: "Lucas (bar)",
      operationId: "migration-order", items: [{ productId: "p1", qty: 1 }],
    });
    saved.proposals = order.state.proposals;
    saved.products = saved.products.map(p => p.id === "p1" ? { ...p, available: false, price: 1700 } : p);
    const migrated = migrateCatalog(saved);
    expect(migrated.proposals).toBe(saved.proposals);
    expect(migrated.stays).toBe(saved.stays);
    expect(migrated.entries).toBe(saved.entries);
    expect(migrated.credentials).toBe(saved.credentials);
    expect(migrated.products.find(p => p.id === "p1")).toMatchObject({ available: false, price: 1700 });
  });

  it("fills missing legacy items and does not duplicate or modify current catalogs", () => {
    const saved = legacy();
    saved.products = saved.products.slice(0, 2);
    const migrated = migrateCatalog(saved);
    expect(migrated.products).toHaveLength(seedState().products.length);
    expect(migrateCatalog(migrated)).toBe(migrated);
    const current = seedState();
    expect(migrateCatalog(current)).toBe(current);
  });
});