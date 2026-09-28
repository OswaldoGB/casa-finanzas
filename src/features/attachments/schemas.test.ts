import { describe, expect, it } from "vitest";
import { uploadSchema } from "./schemas";

describe("uploadSchema", () => {
  const base = {
    transactionId: "8e4ed765-e7b2-42b7-a916-6cf3a9ce96c3",
    mimeType: "image/jpeg",
    sizeBytes: 150000,
  };

  it("accepts a compressed image or PDF within the bucket limit", () => {
    expect(uploadSchema.safeParse(base).success).toBe(true);
    expect(
      uploadSchema.safeParse({
        ...base,
        mimeType: "application/pdf",
        sizeBytes: 10000000,
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported formats and oversized files", () => {
    expect(
      uploadSchema.safeParse({ ...base, mimeType: "image/png" }).success,
    ).toBe(false);
    expect(
      uploadSchema.safeParse({ ...base, sizeBytes: 10485761 }).success,
    ).toBe(false);
    expect(uploadSchema.safeParse({ ...base, sizeBytes: 0 }).success).toBe(
      false,
    );
  });
});
