import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const run = (args, url) =>
  spawnSync(process.execPath, ["scripts/seed-dev.mjs", ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: url ?? "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  });
test("help works without credentials and never requires confirmation", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--confirmar/);
});
test("requires explicit confirmation before accessing the database", () => {
  const result = run([], "https://rtqqmmahfdwcnaydrhhc.supabase.co");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--confirmar/);
});
test("rejects production even with explicit confirmation", () => {
  const result = run(["--confirmar"], "https://production.supabase.co");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /solo.*desarrollo/i);
});
