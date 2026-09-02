#!/usr/bin/env bash
# สำรอง Postgres ของ EDEN ผ่าน docker compose
#   scripts/backup.sh                               # dev (docker-compose.yml)
#   scripts/backup.sh -f docker-compose.prod.yml    # prod
# retention: ลบไฟล์เก่ากว่า BACKUP_KEEP_DAYS วัน (default 14)
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
[ -f .env ] && { set -a; . ./.env; set +a; }

PGUSER="${POSTGRES_USER:-postgres}"
PGDB="${POSTGRES_DB:-EDEN_DB}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

mkdir -p backups
OUT="backups/eden_$(date -u +%Y%m%dT%H%M%SZ).dump"

echo "→ pg_dump ($COMPOSE_FILE) → $OUT"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$PGUSER" -Fc "$PGDB" > "$OUT"

# เช็คว่าได้ไฟล์จริง (exec ที่ fail อาจเขียนไฟล์ว่าง)
if [ ! -s "$OUT" ]; then
  echo "✗ backup ว่าง — ลบทิ้ง" >&2
  rm -f "$OUT"
  exit 1
fi

find backups -name 'eden_*.dump' -mtime "+$KEEP_DAYS" -delete 2>/dev/null || true

echo "✓ $(du -h "$OUT" | cut -f1) · เหลือ $(ls backups/eden_*.dump 2>/dev/null | wc -l) ไฟล์"
