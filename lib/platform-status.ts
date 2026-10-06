import { z } from "zod";

export const componentIds = [
  "portfolio",
  "postgres",
  "keycloak",
  "redpanda",
  "grafana",
  "prometheus",
  "worker",
] as const;
export const stateSchema = z.enum([
  "healthy",
  "degraded",
  "unavailable",
  "unknown",
]);
export const podUsageSchema = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,252}$/),
  namespace: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,252}$/),
  phase: z.enum(["Pending", "Running", "Succeeded", "Failed", "Unknown"]),
  cpuMillicores: z.number().nonnegative().nullable(),
  memoryBytes: z.number().nonnegative().nullable(),
  ready: z.boolean().nullable(),
  restarts: z.number().int().nonnegative().nullable(),
});
export type PodUsage = z.infer<typeof podUsageSchema>;
export const snapshotSchema = z.object({
  schemaVersion: z.literal(1),
  mode: z.literal("live"),
  environment: z.enum(["local-kind", "azure-k3s"]),
  generatedAt: z.string().datetime(),
  staleAfterSeconds: z.literal(120),
  overall: stateSchema,
  telemetry: z
    .object({
      source: z.literal("prometheus"),
      pods: z.array(podUsageSchema).max(500).nullable().optional(),
      cpuPercent: z.number().min(0).max(100).nullable(),
      memoryPercent: z.number().min(0).max(100).nullable(),
      memoryUsedBytes: z.number().nonnegative().nullable(),
      memoryTotalBytes: z.number().positive().nullable(),
      podsRunning: z.number().int().nonnegative().nullable(),
      uptimeSeconds: z.number().nonnegative().nullable(),
    })
    .optional(),
  components: z
    .array(
      z.object({
        id: z.enum(componentIds),
        state: stateSchema,
        ready: z.number().int().nonnegative().optional(),
        desired: z.number().int().nonnegative().optional(),
      }),
    )
    .length(componentIds.length),
});
export type PlatformSnapshot = z.infer<typeof snapshotSchema>;
