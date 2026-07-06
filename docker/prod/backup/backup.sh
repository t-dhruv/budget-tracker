#!/bin/sh
set -e

PG_HOST="${PG_HOST:-db}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${APPLICATION_DB_USERNAME}"
PG_DB="${APPLICATION_DB_DATABASE}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_DIR="/backups"

# Timestamp for the backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup to ${BACKUP_FILE}..."

# Create dump with pg_dump (same flags as CI backup: --no-owner --no-acl)
pg_dump \
    -h "$PG_HOST" \
    -p "$PG_PORT" \
    -U "$PG_USER" \
    -d "$PG_DB" \
    --no-owner \
    --no-acl \
    | gzip > "$BACKUP_FILE"

# Validate backup is not empty (empty gzip is ~20 bytes)
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")
if [ "$BACKUP_SIZE" -lt 100 ]; then
    echo "[$(date)] ERROR: Backup file is too small (${BACKUP_SIZE} bytes), pg_dump likely failed"
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo "[$(date)] Backup created: $(basename ${BACKUP_FILE}) ($(ls -lh ${BACKUP_FILE} | awk '{print $5}'))"

# Rotate old backups
echo "[$(date)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name 'db_backup_*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date)] Backup completed successfully"
