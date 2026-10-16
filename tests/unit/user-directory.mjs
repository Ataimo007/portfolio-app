import assert from "node:assert/strict";
import { build } from "esbuild";
const { outputFiles } = await build({
  entryPoints: ["lib/user-directory.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { userStatus, filteredUserPage } = await import(
  "data:text/javascript;base64," +
    Buffer.from(outputFiles[0].text).toString("base64")
);
assert.equal(
  userStatus({ enabled: false, emailVerified: false }, "active"),
  "disabled",
);
assert.equal(
  userStatus({ enabled: true, emailVerified: false }, "active"),
  "pending",
);
assert.equal(
  userStatus({ enabled: true, emailVerified: true }, "disabled"),
  "disabled",
);
assert.equal(
  userStatus({ enabled: false, emailVerified: true }, "closed"),
  "closed",
);
assert.equal(userStatus({ enabled: true, emailVerified: true }), "active");
const users = Array.from({ length: 235 }, (_, id) => ({
  id,
  match: id % 3 === 0,
}));
const fetchBatch = async (first, max) => users.slice(first, first + max);
const matches = users.filter((u) => u.match);
for (const first of [0, 30, 60, 90]) {
  const page = await filteredUserPage(fetchBatch, (u) => u.match, first);
  assert.deepEqual(page.people, matches.slice(first, first + 30));
  assert.equal(page.hasMore, matches.length > first + 30);
}
const exact = await filteredUserPage(
  async (first) => (first ? [] : users.slice(0, 30)),
  () => true,
  0,
);
assert.equal(exact.people.length, 30);
assert.equal(exact.hasMore, false);
console.log(
  "Directory status precedence and cross-batch filtered pagination passed.",
);
