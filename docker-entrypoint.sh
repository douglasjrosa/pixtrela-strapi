#!/bin/sh
set -e

UPLOADS_DIR="/opt/app/public/uploads"

mkdir -p "$UPLOADS_DIR"
chown -R node:node "$UPLOADS_DIR"
chmod 755 "$UPLOADS_DIR"

exec gosu node "$@"
