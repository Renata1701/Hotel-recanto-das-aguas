import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_APP_URL,
  guestAccessUrl,
  isCorruptQrHostname,
  isExampleQrOrigin,
  isUsableLanIPv4,
  normalizeQrOrigin,
  originHostIsBroken,
  publicGuestQrOrigin,
  unwrapVitePublicAppUrl,
} from "@/lib/guest-access-url";

describe("guest QR origin", () => {
  it("rejects network and broadcast IPv4", () => {
    expect(isUsableLanIPv4("192.168.0.0")).toBe(false);
    expect(isUsableLanIPv4("192.168.1.255")).toBe(false);
    expect(isUsableLanIPv4("10.0.0.0")).toBe(false);
    expect(isUsableLanIPv4("192.168.1.42")).toBe(true);
  });

  it("flags broken stored origins", () => {
    expect(originHostIsBroken("http://192.168.0.0:8080")).toBe(true);
    expect(originHostIsBroken("http://192.168.1.42:8080")).toBe(false);
    expect(isExampleQrOrigin("http://192.168.1.10:8080")).toBe(true);
  });

  it("builds access URL with origin", () => {
    expect(guestAccessUrl("RDA-AN4S-208B", "http://192.168.1.42:8080")).toBe(
      "http://192.168.1.42:8080/cliente/entrar?codigo=RDA-AN4S-208B&qr=1",
    );
  });

  it("builds entrar URL for QR scan", () => {
    expect(guestAccessUrl("RDA-TEST", DEFAULT_PUBLIC_APP_URL)).toBe(
      `${DEFAULT_PUBLIC_APP_URL}/cliente/entrar?codigo=RDA-TEST&qr=1`,
    );
  });

  it("unwraps pasted .env lines and rejects corrupt Lovable hosts", () => {
    expect(unwrapVitePublicAppUrl("VITE_PUBLIC_APP_URL=http://sitema-hotel.free.nf")).toBe(
      "http://sitema-hotel.free.nf",
    );
    expect(isCorruptQrHostname("vitepublicappurlhttpsitema-hotelfreenf.lovable.app")).toBe(true);
    expect(normalizeQrOrigin("https://vitepublicappurlhttpsitema-hotelfreenf.lovable.app")).toBeNull();
    expect(normalizeQrOrigin("http://sitema-hotel.free.nf")).toBe("http://sitema-hotel.free.nf");
  });

  it("falls back to DEFAULT when no env and no browser", () => {
    const prev = globalThis.window;
    // @ts-expect-error — simula SSR / testes sem DOM
    delete globalThis.window;
    expect(publicGuestQrOrigin()).toBe(DEFAULT_PUBLIC_APP_URL);
    globalThis.window = prev;
  });
});
