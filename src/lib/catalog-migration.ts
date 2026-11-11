import type { Product, State } from "./domain";
import { seedState } from "./seed";

/** Upgrade pre-sector demo catalogs without resetting accounts or operations. */
export function migrateCatalog(saved: State): State {
  const catalog = seedState().products;
  const defaults = new Map(catalog.map((product) => [product.id, product]));
  const sectors = new Set(catalog.map((product) => product.sector));
  const legacy = saved.products.some((product) => !sectors.has(product.sector));
  if (!legacy && saved.products.length > 0) return saved;

  const products: Product[] = saved.products.map((product) => {
    if (sectors.has(product.sector)) return product;
    const sector = defaults.get(product.id)?.sector ??
      (product.category === "Pratos" || product.category === "Sobremesas" ? "Restaurante" : "Bar da Piscina");
    return { ...product, sector };
  });
  const existingIds = new Set(products.map((product) => product.id));
  return {
    ...saved,
    products: [...products, ...catalog.filter((product) => !existingIds.has(product.id))],
  };
}