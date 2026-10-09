import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  cardAppearance,
  cardProductOptions,
} from "./card-appearance";
import { CardArtwork } from "./components/card-artwork";

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

  it("keeps official card artwork free of added labels and numbers", () => {
    const markup = renderToStaticMarkup(
      createElement(CardArtwork, {
        account: {
          color: "#b79b50",
          name: "VISA GOLD BA",
          institution: "banco_agricola",
          card_network: "visa",
          card_product: "dorada",
          card_last_four: "2541",
        },
      }),
    );

    expect(markup).not.toContain(">Banco Agrícola<");
    expect(markup).not.toContain(">Dorada Visa<");
    expect(markup).not.toContain(">•••• 2541<");
  });
});
