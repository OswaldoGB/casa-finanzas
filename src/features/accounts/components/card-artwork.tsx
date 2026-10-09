"use client";

import Image from "next/image";
import { useState } from "react";
import { cardAppearance, institutions } from "../card-appearance";

type CardIdentity = {
  color: string;
  name: string;
  institution?: string | null;
  card_network?: string | null;
  card_product?: string | null;
  card_last_four?: string | null;
};

const fallbackStyles: Record<string, string> = {
  agricola: "from-[#8a7438] via-[#b79b50] to-[#6f5a29] text-[#1f1f1c]",
  bac: "from-[#06395b] via-[#116b8b] to-[#023047] text-white",
  cuscatlan: "from-[#f7f4ec] via-white to-[#e8dcc3] text-[#0d4d70]",
  davivienda: "from-[#d9262e] via-[#a50d1e] to-[#621018] text-white",
  promerica: "from-[#0c4777] via-[#146ba7] to-[#042e56] text-white",
  azul: "from-[#0069b4] via-[#2d9bd3] to-[#00467c] text-white",
  hipotecario: "from-[#417d46] via-[#6e9a46] to-[#1f5131] text-white",
  atlantida: "from-[#1b8e97] via-[#49b8b1] to-[#12646f] text-white",
  siman: "from-[#222d68] via-[#384da0] to-[#171d4f] text-white",
  other: "from-slate-700 via-slate-600 to-slate-800 text-white",
};

export function CardArtwork({
  account,
  compact = false,
}: {
  account: CardIdentity;
  compact?: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const appearance = cardAppearance({
    institution: account.institution,
    network: account.card_network,
    product: account.card_product,
  });
  const issuer =
    institutions.find((item) => item.value === account.institution)?.label ??
    "Tarjeta";
  const imageUrl =
    failedImage === appearance.imageUrl ? null : appearance.imageUrl;

  return (
    <div
      className={`relative isolate overflow-hidden rounded-2xl bg-linear-to-br shadow-lg ring-1 ring-black/10 ${fallbackStyles[appearance.fallback] ?? fallbackStyles.other} ${compact ? "aspect-[1.58/1] w-12 rounded-lg shadow-none" : "aspect-[1.586/1] w-full max-w-sm"}`}
      aria-label={`${issuer} ${appearance.label}${account.card_last_four ? ` terminada en ${account.card_last_four}` : ""}`}
    >
      {imageUrl && (
        <Image
          fill
          sizes={compact ? "48px" : "(max-width: 640px) 100vw, 384px"}
          src={imageUrl}
          alt=""
          className="object-cover"
          onError={() => setFailedImage(imageUrl)}
        />
      )}
    </div>
  );
}
