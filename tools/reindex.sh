#!/usr/bin/env bash
set -e

if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is required to run this script. Please install Node.js 14+." >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/reindex.js" "$@"
