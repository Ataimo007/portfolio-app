import { sendPendingEmail } from "./email.mjs";
import { pollMail } from "./mail-poll.mjs";
import { sendPendingPush } from "./push.mjs";
import { collectPods } from "./telemetry.mjs";
import pg from "pg";
import { Kafka, logLevel } from "kafkajs";
import { createServer } from "node:http";

const db = new pg.Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE || "portfolio",
  user: process.env.PGUSER || "portal",
  password: process.env.PGPASSWORD,
  max: 4,
  connectionTimeoutMillis: 4000,
  statement_timeout: 5000,
});
const kafka = new Kafka({
  clientId: "ataimo-worker",
  brokers: process.env.REDPANDA_BROKERS.split(","),
  logLevel: logLevel.NOTHING,
  connectionTimeout: 4000,
  requestTimeout: 8000,
  retry: { retries: 2 },
});
let producer = kafka.producer({
  idempotent: true,
  maxInFlightRequests: 1,
  retry: { retries: 2 },
});
let consumer = kafka.consumer({
  groupId: "ataimo-portal-notifications-v1",
  sessionTimeout: 30000,
});
const topic = "ataimo.portal.events.v1";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let stopping = false,
  brokerReady = false,
  lastTick = 0;
const server = createServer((request, response) => {
  const healthy = lastTick > Date.now() - 120000;
  response.writeHead(request.url === "/health" && healthy ? 200 : 503, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify({ status: healthy ? "ok" : "starting" }));
});
server.listen(3001, "0.0.0.0");

async function connectBroker() {
  await Promise.allSettled([producer.disconnect(), consumer.disconnect()]);
  producer = kafka.producer({
    idempotent: true,
    maxInFlightRequests: 1,
    retry: { retries: 2 },
  });
  consumer = kafka.consumer({
    groupId: "ataimo-portal-notifications-v1",
    sessionTimeout: 30000,
  });
  consumer.on(consumer.events.CRASH, () => {
    if (!stopping) {
      console.error(
        "Consumer crashed; restarting to recover broker connections",
      );
      process.exit(1);
    }
  });

  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      topics: [
        {
          topic,
          numPartitions: 1,
          replicationFactor: 1,
          configEntries: [{ name: "retention.ms", value: "604800000" }],
        },
        {
          topic: topic + ".dead-letter",
          numPartitions: 1,
          replicationFactor: 1,
        },
      ],
    });
  } finally {
    await admin.disconnect();
  }
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      let data;
      try {
        data = JSON.parse(message.value.toString());
        if (
          ![1, 2, 3].includes(data.schemaVersion) ||
          (data.schemaVersion === 3 && data.eventType !== "mail.received") ||
          (data.schemaVersion !== 3 && data.eventType === "mail.received") ||
          ![
            "booking.requested",
            "booking.approved",
            "booking.declined",
            "job.active",
            "task.updated",
            "job.completed",
            "job.cancelled",
            "message.created",
            "mail.received",
          ].includes(data.eventType) ||
          !Array.isArray(data.recipientIds) ||
          data.recipientIds.length > 100 ||
          ![
            data.id,
            ...(data.schemaVersion === 3
              ? []
              : [data.schemaVersion === 2 ? data.conversationId : data.jobId]),
            ...data.recipientIds,
          ].every(
            (value) =>
              typeof value === "string" &&
              /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
                value,
              ),
          )
        )
          throw Error("Invalid event");
      } catch {
        await producer.send({
          topic: topic + ".dead-letter",
          messages: [
            {
              value: JSON.stringify({
                reason: "invalid-envelope",
                observedAt: new Date().toISOString(),
              }),
            },
          ],
        });
        console.error("Rejected invalid event envelope");
        return;
      }
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const inserted = await client.query(
          "INSERT INTO processed_events(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",
          [data.id],
        );
        if (inserted.rowCount) {
          for (const recipient of new Set(data.recipientIds)) {
            await client.query(
              "INSERT INTO portal_notifications(event_id,client_id,job_id,kind,conversation_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
              [
                data.id,
                recipient,
                data.schemaVersion === 1 ? data.jobId : null,
                data.eventType,
                data.schemaVersion === 2 ? data.conversationId : null,
              ],
            );
          }
        }
        await client.query(
          "INSERT INTO push_deliveries(notification_id,subscription_id) SELECT n.id,s.id FROM portal_notifications n JOIN push_subscriptions s ON s.client_id=n.client_id WHERE n.event_id=$1 ON CONFLICT DO NOTHING",
          [data.id],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        if (["23503", "22P02"].includes(error.code)) {
          await producer.send({
            topic: topic + ".dead-letter",
            messages: [
              {
                value: JSON.stringify({
                  id: data.id,
                  reason: "reference-unavailable",
                  observedAt: new Date().toISOString(),
                }),
              },
            ],
          });
          console.error("Rejected event with unavailable references");
          return;
        }
        throw error;
      } finally {
        client.release();
      }
    },
  });
  brokerReady = true;
  console.log("Redpanda consumer connected");
}
async function publish() {
  if (!brokerReady) return;
  const client = await db.connect();
  let row;
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT * FROM event_outbox WHERE published_at IS NULL AND attempts<8 AND next_attempt_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1",
    );
    row = result.rows[0];
    if (row) {
      await producer.send({
        topic,
        messages: [
          {
            key: row.aggregate_id,
            value: JSON.stringify({
              ...row.payload,
              id: row.id,
              eventType: row.event_type,
            }),
          },
        ],
      });
      await client.query(
        "UPDATE event_outbox SET published_at=now() WHERE id=$1",
        [row.id],
      );
    }
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    if (row)
      await db.query(
        "UPDATE event_outbox SET attempts=attempts+1,next_attempt_at=now()+least(300,power(2,attempts+1)) * interval '1 second' WHERE id=$1",
        [row.id],
      );
    console.error("Outbox publish deferred");
  } finally {
    client.release();
  }
}
const components = [
  ["portfolio", "deployment", "app", "portfolio"],
  ["postgres", "statefulset", "database", "postgres"],
  ["keycloak", "deployment", "identity", "keycloak"],
  ["redpanda", "statefulset", "streaming", "redpanda"],
  ["grafana", "deployment", "monitoring", "monitoring-grafana"],
  [
    "prometheus",
    "statefulset",
    "monitoring",
    "prometheus-monitoring-kube-prometheus-prometheus",
  ],
  ["worker", "deployment", "app", "portfolio-worker"],
];
async function query(expression) {
  const url = new URL("/api/v1/query", process.env.PROMETHEUS_URL);
  url.searchParams.set("query", expression);
  const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw Error("Telemetry source unavailable");
  const result = await response.json();
  if (result.status !== "success") throw Error("Telemetry query failed");
  return result.data.result;
}
async function resourceTelemetry() {
  const fresh = (metric) =>
    `(${metric}) and (time() - timestamp(${metric}) < 120)`;
  const expressions = [
    `100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]) and (time() - timestamp(node_cpu_seconds_total{mode="idle"}) < 120)))`,
    `100 * (1 - sum(${fresh("node_memory_MemAvailable_bytes")}) / sum(${fresh("node_memory_MemTotal_bytes")}))`,
    `sum(${fresh("node_memory_MemTotal_bytes")}) - sum(${fresh("node_memory_MemAvailable_bytes")})`,
    `sum(${fresh("node_memory_MemTotal_bytes")})`,
    `sum(${fresh('kube_pod_status_phase{phase="Running"}')})`,
    `min(time() - ${fresh("node_boot_time_seconds")})`,
  ];
  const [results, pods] = await Promise.all([
    Promise.allSettled(expressions.map(query)),
    collectPods(query),
  ]);
  const values = results.map((result, index) => {
    if (result.status !== "fulfilled" || result.value.length !== 1) return null;
    const sample = result.value[0].value;
    const value = Number(sample[1]);
    if (
      !Number.isFinite(value) ||
      value < 0 ||
      Date.now() / 1000 - sample[0] > 120
    )
      return null;
    if (index < 2 && value > 100) return null;
    if (index === 4 && !Number.isInteger(value)) return null;
    if (index === 3 && value === 0) return null;
    return value;
  });
  return Object.fromEntries([
    ["source", "prometheus"],
    ["pods", pods],
    ...[
      "cpuPercent",
      "memoryPercent",
      "memoryUsedBytes",
      "memoryTotalBytes",
      "podsRunning",
      "uptimeSeconds",
    ].map((name, index) => [name, values[index]]),
  ]);
}
async function snapshot() {
  try {
    const [deployReady, deployDesired, stsReady, stsDesired] =
      await Promise.all([
        query(
          "kube_deployment_status_replicas_available and (time() - timestamp(kube_deployment_status_replicas_available) < 120)",
        ),
        query(
          "kube_deployment_spec_replicas and (time() - timestamp(kube_deployment_spec_replicas) < 120)",
        ),
        query(
          "kube_statefulset_status_replicas_ready and (time() - timestamp(kube_statefulset_status_replicas_ready) < 120)",
        ),
        query(
          "kube_statefulset_replicas and (time() - timestamp(kube_statefulset_replicas) < 120)",
        ),
      ]);
    const values = components.map(([id, kind, namespace, name]) => {
      const ready = (kind === "deployment" ? deployReady : stsReady).find(
        (x) => x.metric.namespace === namespace && x.metric[kind] === name,
      );
      const desired = (kind === "deployment" ? deployDesired : stsDesired).find(
        (x) => x.metric.namespace === namespace && x.metric[kind] === name,
      );
      if (
        !ready ||
        !desired ||
        Date.now() / 1000 - ready.value[0] > 120 ||
        Date.now() / 1000 - desired.value[0] > 120
      )
        return { id, state: "unknown" };
      const r = Number(ready.value[1]),
        d = Number(desired.value[1]);
      if (!Number.isInteger(r) || !Number.isInteger(d) || r < 0 || d < 0)
        return { id, state: "unknown" };
      return {
        id,
        state:
          d === 0
            ? "unknown"
            : r === 0
              ? "unavailable"
              : r < d
                ? "degraded"
                : "healthy",
        ready: r,
        desired: d,
      };
    });
    const overall = values.some((x) => x.state === "unavailable")
      ? "unavailable"
      : values.some((x) => x.state === "degraded")
        ? "degraded"
        : values.some((x) => x.state === "unknown")
          ? "unknown"
          : "healthy";
    const value = {
      schemaVersion: 1,
      mode: "live",
      environment:
        process.env.PLATFORM_ENVIRONMENT === "azure-k3s"
          ? "azure-k3s"
          : "local-kind",
      generatedAt: new Date().toISOString(),
      staleAfterSeconds: 120,
      overall,
      components: values,
      telemetry: await resourceTelemetry(),
    };
    await db.query(
      "INSERT INTO platform_snapshots(id,snapshot,generated_at) VALUES(1,$1,now()) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot,generated_at=excluded.generated_at",
      [JSON.stringify(value)],
    );
  } catch {
    console.error("Telemetry collection unavailable; retaining last snapshot");
  }
}
async function main() {
  let nextConnect = 0,
    nextSnapshot = 0,
    nextMail = 0;
  while (!stopping) {
    try {
      if (!brokerReady && Date.now() > nextConnect) {
        nextConnect = Date.now() + 30000;
        try {
          await connectBroker();
        } catch (error) {
          console.error("Broker unavailable; outbox retained", {
            type: error.name,
            message: error.message,
          });
        }
      }
      await publish();
      await sendPendingPush(db);
      await sendPendingEmail(db);
      if (Date.now() > nextMail) {
        nextMail = Date.now() + 60000;
        try {
          await pollMail(db);
        } catch {
          console.error("Mailbox notification check deferred");
        }
      }
      if (Date.now() > nextSnapshot) {
        nextSnapshot = Date.now() + 30000;
        await snapshot();
      }
      await db.query(
        "INSERT INTO worker_heartbeat(id,observed_at) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET observed_at=excluded.observed_at",
      );
      await db.query("DELETE FROM portal_sessions WHERE expires_at<now()");
      await db.query("DELETE FROM api_rate_limits WHERE expires_at<now()");
      await db.query(
        "DELETE FROM account_challenges WHERE expires_at<now()-interval '7 days'",
      );
      lastTick = Date.now();
    } catch {
      console.error("Worker iteration deferred");
    }
    await sleep(1000);
  }
}
consumer.on(consumer.events.CRASH, () => {
  if (!stopping) {
    console.error("Consumer crashed; restarting to recover broker connections");
    process.exit(1);
  }
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stopping = true;
    server.close();
    Promise.allSettled([consumer.disconnect(), producer.disconnect()])
      .finally(() => db.end())
      .finally(() => process.exit(0));
  });
main().catch(() => {
  console.error("Worker stopped unexpectedly");
  process.exit(1);
});
