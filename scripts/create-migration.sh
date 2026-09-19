#!/usr/bin/env sh
set -eu

migration_mode="${1:-}"
migration_name="${2:-}"

case "$migration_mode" in
  create|generate) ;;
  *)
    echo "Usage: bun run migration:<create|generate> -- <MigrationName>" >&2
    exit 1
    ;;
esac

case "$migration_name" in
  ''|*[!A-Za-z0-9_-]*|[0-9]*)
    echo "Migration names must start with a letter and use only letters, numbers, hyphens, or underscores." >&2
    exit 1
    ;;
esac

if [ "$migration_mode" = "generate" ]; then
  exec bun ./node_modules/typeorm/cli.js migration:generate -d ./src/data-source.ts "src/migrations/$migration_name"
fi

exec bun ./node_modules/typeorm/cli.js migration:create "src/migrations/$migration_name"
