import fs from "node:fs";
const path = process.argv[2] || "/etc/hosts";
const backup = process.argv[3];
const domains = new Set(["ataimo.com", "keycloak.ataimo.com", "grafana.ataimo.com", "redpanda.ataimo.com"]);
const original = fs.readFileSync(path, "utf8");
if (backup && !fs.existsSync(backup)) fs.writeFileSync(backup, original, { mode: 0o600, flag: "wx" });
let managed = false;
const lines = [];
for (const line of original.split("\n")) {
  if (line === "# BEGIN ATAIMO LOCAL GATEWAY") { managed = true; continue; }
  if (line === "# END ATAIMO LOCAL GATEWAY") { managed = false; continue; }
  if (managed) continue;
  const hash = line.indexOf("#");
  const content = hash < 0 ? line : line.slice(0, hash);
  const comment = hash < 0 ? "" : line.slice(hash);
  const fields = content.trim().split(/\s+/);
  if (fields.length < 2 || !fields.slice(1).some(domain => domains.has(domain))) { lines.push(line); continue; }
  const aliases = fields.slice(1).filter(domain => !domains.has(domain));
  if (aliases.length) lines.push(`${fields[0]}\t${aliases.join(" ")}${comment ? ` ${comment}` : ""}`);
  else if (comment) lines.push(comment);
}
const result = `${lines.join("\n").trimEnd()}\n\n# BEGIN ATAIMO LOCAL GATEWAY\n127.0.0.1 ${[...domains].join(" ")}\n# END ATAIMO LOCAL GATEWAY\n`;
if (result !== original) fs.writeFileSync(path, result);
console.log(`Hosts mappings verified in ${path}`);
