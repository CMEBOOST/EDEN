#!/usr/bin/env bash
# ตั้งสัญญา active ที่เลย end_date เป็น expired — รันผ่าน cron วันละครั้ง
#   scripts/expire-contracts.sh                               # dev
#   scripts/expire-contracts.sh -f docker-compose.prod.yml    # prod
set -euo pipefail

COMPOSE_FILE="docker-compose.yml"
while getopts "f:" o; do
  case $o in
    f) COMPOSE_FILE=$OPTARG ;;
    *) echo "ใช้: $0 [-f <compose-file>]" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "→ expire-contracts ($COMPOSE_FILE)"
docker compose -f "$COMPOSE_FILE" exec -T backend uv run python expire_contracts.py
