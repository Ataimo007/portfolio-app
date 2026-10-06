#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"
require_cluster
TOPIC=ataimo-platform-smoke
if ! kubectl exec -n streaming redpanda-0 -c redpanda -- rpk topic describe "$TOPIC" >/dev/null 2>&1; then
  kubectl exec -n streaming redpanda-0 -c redpanda -- rpk topic create "$TOPIC" --partitions 1 --replicas 1
fi
RECORD="synthetic-local-verification-$(date -u +%Y%m%dT%H%M%S)-$RANDOM"
printf '%s\n' "$RECORD" | kubectl exec -i -n streaming redpanda-0 -c redpanda -- rpk topic produce "$TOPIC"
RESULT="$(timeout 20s kubectl exec -n streaming redpanda-0 -c redpanda -- rpk topic consume "$TOPIC" --offset=-1 --num 1 --format '%v')"
test "$RESULT" = "$RECORD"
echo 'Verified synthetic local record: Kafka produce and consume passed.'
