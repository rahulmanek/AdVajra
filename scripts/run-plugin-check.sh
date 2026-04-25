#!/usr/bin/env bash

set -euo pipefail

PLUGIN_SLUG="advajra"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEFAULT_WP_ROOT="$(cd "${PLUGIN_DIR}/../../.." && pwd)"
WP_ROOT="${WP_ROOT:-${DEFAULT_WP_ROOT}}"

log() {
	printf '==> %s\n' "$*"
}

die() {
	printf 'Error: %s\n' "$*" >&2
	exit 1
}

require_command() {
	command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

require_command wp
require_command php

[[ -f "${WP_ROOT}/wp-load.php" ]] || die "Could not find wp-load.php in ${WP_ROOT}. Set WP_ROOT to your WordPress root."

if ! wp help plugin check --path="${WP_ROOT}" >/dev/null 2>&1; then
	die "The official Plugin Check WP-CLI command is not available in ${WP_ROOT}. Install and activate the plugin-check plugin first."
fi

log "Running Plugin Check"
RESULT="$(
	wp plugin check "${PLUGIN_SLUG}" \
		--path="${WP_ROOT}" \
		--format=strict-json \
		--skip-plugins=easy-digital-downloads \
		--exclude-directories=".release,scripts,.github,.git,docs" \
		--exclude-files=".DS_Store,.gitattributes,.gitignore,package-lock.json" \
		2>/dev/null || true
)"
printf '%s\n' "${RESULT}"

if ! printf '%s' "${RESULT}" | php -r '$data = json_decode(stream_get_contents(STDIN), true); exit(is_array($data) ? 0 : 1);'; then
	if printf '%s' "${RESULT}" | grep -q 'No errors found'; then
		log "Plugin Check passed with zero issues"
		exit 0
	fi

	die "Plugin Check did not return JSON output."
fi

COUNT="$(printf '%s' "${RESULT}" | php -r '$data = json_decode(stream_get_contents(STDIN), true); echo is_array($data) ? count($data) : 0;')"

if [[ "${COUNT}" -gt 0 ]]; then
	die "Plugin Check reported ${COUNT} issue(s)."
fi

log "Plugin Check passed with zero issues"
