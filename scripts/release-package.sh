#!/usr/bin/env bash

set -euo pipefail

PLUGIN_SLUG="advajra"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
RELEASE_DIR="${PLUGIN_DIR}/.release"
STAGE_DIR="${RELEASE_DIR}/${PLUGIN_SLUG}"
WPORG_DIR="${RELEASE_DIR}/wporg"
WPORG_TRUNK_DIR="${WPORG_DIR}/trunk"
WPORG_ASSETS_DIR="${WPORG_DIR}/assets"
ARTIFACT_DIR="${RELEASE_DIR}/artifacts"
ARTIFACT_ZIP="${ARTIFACT_DIR}/${PLUGIN_SLUG}.zip"

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

read_plugin_version() {
	sed -n 's/^ \* Version:[[:space:]]*//p' "${PLUGIN_DIR}/advajra.php" | head -n 1 | tr -d '\r'
}

read_stable_tag() {
	sed -n 's/^Stable tag:[[:space:]]*//p' "${PLUGIN_DIR}/readme.txt" | head -n 1 | tr -d '\r'
}

read_package_version() {
	php -r '$pkg = json_decode(file_get_contents($argv[1]), true); echo is_array($pkg) && isset($pkg["version"]) ? $pkg["version"] : "";' "${PLUGIN_DIR}/package.json"
}

verify_versions() {
	local plugin_version
	local stable_tag
	local package_version

	plugin_version="$(read_plugin_version)"
	stable_tag="$(read_stable_tag)"
	package_version="$(read_package_version)"

	[[ -n "${plugin_version}" ]] || die "Could not read plugin version from advajra.php"
	[[ -n "${stable_tag}" ]] || die "Could not read Stable tag from readme.txt"
	[[ "${plugin_version}" == "${stable_tag}" ]] || die "Version mismatch: advajra.php is ${plugin_version} but readme.txt Stable tag is ${stable_tag}"

	if [[ -n "${package_version}" && "${plugin_version}" != "${package_version}" ]]; then
		die "Version mismatch: advajra.php is ${plugin_version} but package.json is ${package_version}"
	fi

	log "Version checks passed (${plugin_version})"
}

build_assets() {
	require_command npm

	if [[ ! -d "${PLUGIN_DIR}/node_modules" ]]; then
		if [[ "${ADVAJRA_SKIP_NPM_CI:-0}" == "1" ]]; then
			die "node_modules is missing and ADVAJRA_SKIP_NPM_CI=1 prevented npm ci"
		fi

		log "Installing JavaScript dependencies"
		(
			cd "${PLUGIN_DIR}"
			npm ci
		)
	fi

	log "Building production assets"
	(
		cd "${PLUGIN_DIR}"
		npm run build
	)

	[[ -f "${PLUGIN_DIR}/build/index.asset.php" ]] || die "Missing build/index.asset.php after build"
	[[ -f "${PLUGIN_DIR}/build/tracking.asset.php" ]] || die "Missing build/tracking.asset.php after build"
	[[ -f "${PLUGIN_DIR}/build/advajra-block.asset.php" ]] || die "Missing build/advajra-block.asset.php after build"
}

stage_runtime_paths() {
	local target_dir="$1"
	local path
	local runtime_paths=(
		"advajra.php"
		"readme.txt"
		"license.txt"
		"uninstall.php"
		"build"
		"assets"
		"inc"
		"languages"
	)

	for path in "${runtime_paths[@]}"; do
		[[ -e "${PLUGIN_DIR}/${path}" ]] || die "Expected runtime path not found: ${path}"
		rsync -a "${PLUGIN_DIR}/${path}" "${target_dir}/"
	done
}

write_runtime_autoloader() {
	local target_dir="$1"
	local vendor_dir="${target_dir}/vendor"

	mkdir -p "${vendor_dir}"

	cat > "${vendor_dir}/autoload.php" <<'PHP'
<?php
spl_autoload_register(
	static function ( $class ) {
		$prefix   = 'AdVajra\\';
		$base_dir = dirname( __DIR__ ) . '/inc/';
		$length   = strlen( $prefix );

		if ( strncmp( $prefix, $class, $length ) !== 0 ) {
			return;
		}

		$relative_class = substr( $class, $length );
		$file           = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';

		if ( file_exists( $file ) ) {
			require $file;
		}
	}
);

return true;
PHP
}

copy_wporg_assets() {
	local asset_file
	local relative_path
	local destination

	if [[ ! -d "${PLUGIN_DIR}/wordpress-org-assets" ]]; then
		return
	fi

	while IFS= read -r -d '' asset_file; do
		relative_path="${asset_file#${PLUGIN_DIR}/wordpress-org-assets/}"

		case "${relative_path}" in
			README.md|README.txt|*.md|.DS_Store)
				continue
				;;
		esac

		destination="${WPORG_ASSETS_DIR}/${relative_path}"
		mkdir -p "$(dirname "${destination}")"
		cp "${asset_file}" "${destination}"
	done < <(find "${PLUGIN_DIR}/wordpress-org-assets" -type f -print0)
}

clean_release_dirs() {
	rm -rf "${STAGE_DIR}" "${WPORG_TRUNK_DIR}" "${WPORG_ASSETS_DIR}"
	mkdir -p "${STAGE_DIR}" "${WPORG_TRUNK_DIR}" "${WPORG_ASSETS_DIR}" "${ARTIFACT_DIR}"
	rm -f "${ARTIFACT_ZIP}"
}

remove_os_junk() {
	find "${STAGE_DIR}" "${WPORG_TRUNK_DIR}" "${WPORG_ASSETS_DIR}" -name '.DS_Store' -delete 2>/dev/null || true
}

package_zip() {
	require_command zip

	log "Creating installable zip"
	(
		cd "${RELEASE_DIR}"
		zip -qr "${ARTIFACT_ZIP}" "${PLUGIN_SLUG}"
	)

	[[ -f "${ARTIFACT_ZIP}" ]] || die "Zip artifact was not created"
}

main() {
	require_command rsync
	require_command php

	verify_versions
	build_assets
	clean_release_dirs

	log "Staging installable plugin"
	stage_runtime_paths "${STAGE_DIR}"
	write_runtime_autoloader "${STAGE_DIR}"

	log "Staging WordPress.org trunk"
	stage_runtime_paths "${WPORG_TRUNK_DIR}"
	write_runtime_autoloader "${WPORG_TRUNK_DIR}"
	copy_wporg_assets
	remove_os_junk

	package_zip

	log "Release package ready"
	printf 'Zip: %s\n' "${ARTIFACT_ZIP}"
	printf 'Plugin staging: %s\n' "${STAGE_DIR}"
	printf 'WordPress.org staging: %s\n' "${WPORG_DIR}"
}

main "$@"
