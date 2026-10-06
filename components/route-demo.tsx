"use client";
import { useState } from "react";
const routes = [
  { domain: "api.example.test", path: "/orders/", name: "Orders service" },
  { domain: "api.example.test", path: "/orders/", name: "Orders legacy" },
  {
    domain: "api.example.test",
    path: "/orders/history/",
    name: "Order history",
  },
];
export default function RouteDemo() {
  const [mode, setMode] = useState("strict");
  const [format, setFormat] = useState("table");
  const selected = mode === "strict" ? routes.slice(0, 2) : routes;
  const output =
    format === "JSON"
      ? JSON.stringify(selected, null, 2)
      : format === "CSV"
        ? [
            "domain,path,name",
            ...selected.map((r) => `${r.domain},${r.path},${r.name}`),
          ].join("\n")
        : [
            "DOMAIN              LISTEN PATH          API",
            ...selected.map(
              (r) => `${r.domain.padEnd(20)}${r.path.padEnd(21)}${r.name}`,
            ),
          ].join("\n");
  return (
    <section className="route-demo">
      <h2>Explore a route conflict</h2>
      <p>
        Synthetic example to explain the concept. This is not live output from
        the CLI. Strict shows duplicate paths; broad also illustrates a
        potentially overlapping child path.
      </p>
      <div className="demo-controls">
        <label>
          Match mode{" "}
          <select
            aria-label="Match mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="strict">Strict</option>
            <option value="broad">Broad</option>
          </select>
        </label>
        <label>
          Output{" "}
          <select
            aria-label="Output"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            {["table", "JSON", "CSV"].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>
      <pre aria-live="polite">{output}</pre>
    </section>
  );
}
