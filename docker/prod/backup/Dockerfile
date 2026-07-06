FROM alpine:3.20

RUN apk add --no-cache postgresql-client dcron bash

COPY docker/prod/backup/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Create backup directory
RUN mkdir -p /backups

# Environment variables with defaults
ENV PG_HOST=db \
    PG_PORT=5432 \
    BACKUP_SCHEDULE="0 4 * * *" \
    BACKUP_RETENTION_DAYS=30

# Install the cron job
RUN echo "$BACKUP_SCHEDULE /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /var/spool/cron/crontabs/root

# Start cron and tail log
CMD ["sh", "-c", "crond -b -l 2 && touch /var/log/backup.log && tail -f /var/log/backup.log"]
