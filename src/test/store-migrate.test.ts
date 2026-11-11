import { describe, expect, it, beforeEach } from "vitest";
import { reloadStoreFromStorage, resetDemo } from "@/lib/store";
import { productsInSector } from "@/lib/domain";
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
});
