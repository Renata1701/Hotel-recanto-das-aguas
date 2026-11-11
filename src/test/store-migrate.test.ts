import { describe, expect, it, beforeEach } from "vitest";
import { reloadStoreFromStorage, resetDemo } from "@/lib/store";
import { loginCredential, productsInSector } from "@/lib/domain";
import { RENATA_DEMO_GUEST } from "@/lib/demo-client";
import { seedState } from "@/lib/seed";

const KEY = "rda-state-v1";

describe("store migrate products", () => {
  beforeEach(() => {
    localStorage.removeItem(KEY);
    resetDemo();
  });

  it("repairs products saved without sector", () => {
    const base = seedState();
    const legacy = {
      ...base,
      products: base.products.map(({ sector: _s, ...p }) => p),
    };
    localStorage.setItem(KEY, JSON.stringify(legacy));

    const loaded = reloadStoreFromStorage();
    const bar = productsInSector(loaded.products, "Bar da Piscina");
    expect(bar.length).toBeGreaterThan(10);
  });

  it("injeta credencial da Renata em snapshot antigo", () => {
    const base = seedState();
    const legacy = {
      ...base,
      stays: base.stays.filter((s) => s.id !== "sty_210"),
      credentials: base.credentials.filter((c) => c.code !== RENATA_DEMO_GUEST.credential),
    };
    localStorage.setItem(KEY, JSON.stringify(legacy));

    const loaded = reloadStoreFromStorage();
    expect(() => loginCredential(loaded, RENATA_DEMO_GUEST.credential, RENATA_DEMO_GUEST.pin)).not.toThrow();
  });
});
