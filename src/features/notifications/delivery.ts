import type { DeliveryClaim } from "./types";
export type DeliveryOutcome =
  "sent" | "retry" | "failed" | "expired" | "cancelled";
export async function deliverClaim(
  claim: DeliveryClaim,
  deps: {
    validate: (c: DeliveryClaim) => Promise<boolean>;
    send: (c: DeliveryClaim) => Promise<void>;
    finish: (c: DeliveryClaim, outcome: DeliveryOutcome) => Promise<void>;
  },
) {
  if (!(await deps.validate(claim))) {
    await deps.finish(claim, "cancelled");
    return "cancelled" as const;
  }
  let outcome: DeliveryOutcome = "sent";
  try {
    await deps.send(claim);
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 0;
    outcome =
      status === 404 || status === 410
        ? "expired"
        : claim.attempts >= 5
          ? "failed"
          : "retry";
  }
  await deps.finish(claim, outcome);
  return outcome;
}
