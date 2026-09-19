#!/bin/sh
set -eu

case "${SERVICE_ROLE:-api}" in
  migrator)
    exec node dist/src/database/migration-runner.js
    ;;
  api)
    exec node dist/src/main.js
    ;;
  *)
    echo "Unsupported SERVICE_ROLE: ${SERVICE_ROLE}" >&2
    exit 64
    ;;
esac
