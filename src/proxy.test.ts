import { describe, expect, it } from "vitest";
import { isPublicPath } from "./proxy";

describe("rutas públicas del proxy", () => {
  it("serves the service worker publicly without making application pages public",()=>{expect(isPublicPath("/sw.js")).toBe(true);expect(isPublicPath("/reminders")).toBe(false)});
  it("permite cargar los iconos de identidad sin iniciar sesión", () => {
    expect(isPublicPath("/icon")).toBe(true);
    expect(isPublicPath("/apple-icon")).toBe(true);
  });
});
