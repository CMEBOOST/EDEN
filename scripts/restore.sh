#!/usr/bin/env bash
# กู้คืน Postgres ของ EDEN จากไฟล์ .dump — **เขียนทับข้อมูลปัจจุบัน**
#   scripts/restore.sh backups/eden_XXXX.dump
#   scripts/restore.sh backups/eden_XXXX.dump -f docker-compose.prod.yml
set -euo pipefail

FILE="${1:?ระบุไฟล์ .dump — ใช้: $0 <file> [-f <compose-file>]}"
shift

COMPOSE_FILE="docker-compose.yml"
while getopts "f:" o; do
  case $o in
    f) COMPOSE_FILE=$OPTARG ;;
    *) echo "ใช้: $0 <file> [-f <compose-file>]" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[ -f .env ] && { set -a; . ./.env; set +a; }

PGUSER="${POSTGRES_USER:-postgres}"
PGDB="${POSTGRES_DB:-EDEN_DB}"

[ -f "$FILE" ] || { echo "ไม่พบไฟล์: $FILE" >&2; exit 1; }

read -rp "⚠  จะเขียนทับ DB '$PGDB' ($COMPOSE_FILE) ด้วย '$FILE' — พิมพ์ 'yes' เพื่อยืนยัน: " ok
[ "$ok" = "yes" ] || { echo "ยกเลิก"; exit 1; }

# หยุด backend/migrate กัน connection ค้างตอน DROP
docker compose -f "$COMPOSE_FILE" stop backend migrate 2>/dev/null || true

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore -U "$PGUSER" -d "$PGDB" --clean --if-exists --no-owner < "$FILE"

docker compose -f "$COMPOSE_FILE" start backend 2>/dev/null || true

echo "✓ กู้คืนจาก $FILE แล้ว"
