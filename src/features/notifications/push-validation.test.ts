import { expect, it } from "vitest";
import {
  validatePushEndpoint,
  pushSubscriptionSchema,
} from "./push-validation";
it("permits only recognized HTTPS push servers", () => {
  for (const url of [
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/abc",
    "https://wns2.notify.windows.com/abc",
  ])
    expect(validatePushEndpoint(url).protocol).toBe("https:");
  for (const url of [
    "http://fcm.googleapis.com/x",
    "https://127.0.0.1/x",
    "https://localhost/x",
    "https://fcm.googleapis.com.attacker.com/x",
    "https://user@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:444/x",
    "https://attacker.com/x",
  ])
    expect(() => validatePushEndpoint(url)).toThrow();
});
it("validates browser encryption keys without exposing them", () => {
  expect(
    pushSubscriptionSchema.safeParse({
      endpoint: "https://fcm.googleapis.com/x",
      keys: { p256dh: "bad", auth: "bad" },
    }).success,
  ).toBe(false);
});
