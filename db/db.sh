#!/bin/bash
set -euo pipefail

CONTAINER_NAME="pixtrela-mysql"
BACKUP_DIR="/backups"
BACKUP_FILENAME="backup_$(date +%d-%m-%Y_%H.%M.%S).sql"
MAX_FILES=5
ENV_FILE="/var/www/pixtrela/strapi/db/.env"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

DB_USERNAME="root"
DB_PASSWORD="$MYSQL_ROOT_PASSWORD"
DB_NAME="$MYSQL_DATABASE"

BACKUP_CMD="mysqldump -u $DB_USERNAME -p'$DB_PASSWORD' $DB_NAME > $BACKUP_DIR/$BACKUP_FILENAME"
docker exec "$CONTAINER_NAME" sh -c "$BACKUP_CMD"

num_files=$(docker exec "$CONTAINER_NAME" sh -c "ls $BACKUP_DIR | wc -l")
if [ "$num_files" -gt "$MAX_FILES" ]; then
  oldest_file=$(docker exec "$CONTAINER_NAME" sh -c "ls -t $BACKUP_DIR | tail -n 1")
  docker exec "$CONTAINER_NAME" sh -c "rm $BACKUP_DIR/$oldest_file"
fi
