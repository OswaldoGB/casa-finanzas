import { describe, expect, it } from "vitest";
import {
  cardAppearance,
  cardProductOptions,
} from "./card-appearance";

describe("card appearance catalog", () => {
  it("uses Banco Agrícola's official image for its Dorada Visa", () => {
    expect(
      cardAppearance({
        institution: "banco_agricola",
        network: "visa",
        product: "dorada",
      }),
    ).toMatchObject({
      label: "Dorada Visa",
      imageUrl: "https://www.bancoagricola.com/multimedia/render/10462",
    });
  });

  it("keeps a polished fallback when a product has no official image", () => {
    expect(
      cardAppearance({
        institution: "siman",
        network: "siman",
        product: "diamante",
      }),
    ).toMatchObject({
      label: "CREDISIMAN Diamante",
      imageUrl: null,
      fallback: "siman",
    });
  });

  it("offers the variants available for the selected institution", () => {
    expect(cardProductOptions("banco_agricola")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "dorada", label: "Dorada Visa" }),
      ]),
    );
  });
});
