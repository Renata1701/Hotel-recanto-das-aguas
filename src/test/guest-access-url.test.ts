import { describe, expect, it } from "vitest";
import {
  guestAccessUrl,
  isExampleQrOrigin,
  isUsableLanIPv4,
  originHostIsBroken,
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
});
