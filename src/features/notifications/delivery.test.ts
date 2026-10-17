import { expect, it, vi } from "vitest";
import { deliverClaim } from "./delivery";
import type { DeliveryClaim } from "./types";
const claim = {
  id: "one",
  lease_token: "lease",
  notification_id: "notice",
  reminder_id: "reminder",
  message: "Aviso",
  subscription_id: "sub",
  endpoint: "https://fcm.googleapis.com/x",
  keys: { auth: "a", p256dh: "b" },
  attempts: 1,
} satisfies DeliveryClaim;
it("revalidates immediately before send and cancels invalid work", async () => {
  const send = vi.fn(),
    finish = vi.fn();
  await deliverClaim(claim, { validate: async () => false, send, finish });
  expect(send).not.toHaveBeenCalled();
  expect(finish).toHaveBeenCalledWith(claim, "cancelled");
});
it("isolates expired devices from transient errors and stops retrying after five attempts", async () => {
  const finish = vi.fn();
  await deliverClaim(claim, {
    validate: async () => true,
    send: async () => {
      throw { statusCode: 410 };
    },
    finish,
  });
  expect(finish).toHaveBeenLastCalledWith(claim, "expired");
  await deliverClaim(claim, {
    validate: async () => true,
    send: async () => {
      throw new Error("network");
    },
    finish,
  });
  expect(finish).toHaveBeenLastCalledWith(claim, "retry");
  const last = { ...claim, attempts: 5 };
  await deliverClaim(last, {
    validate: async () => true,
    send: async () => {
      throw new Error("network");
    },
    finish,
  });
  expect(finish).toHaveBeenLastCalledWith(last, "failed");
});
it("marks success only after the provider accepts", async () => {
  const order: string[] = [];
  await deliverClaim(claim, {
    validate: async () => true,
    send: async () => {
      order.push("sent");
    },
    finish: async () => {
      order.push("saved");
    },
  });
  expect(order).toEqual(["sent", "saved"]);
});
