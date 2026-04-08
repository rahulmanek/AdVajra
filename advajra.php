<?php
/**
 * Plugin Name:       AdVajra
 * Description:       Control. Optimize. Monetize.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Plugin URI:        https://advajra.com
 * Author:            Rahul Manek (idevelop.pro)
 * Author URI:        https://idevelop.pro
 * License:           GPL-2.0+
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       advajra
 * Domain Path:       /languages
 *
 * @package AdVajra
 */

namespace AdVajra;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}


define( 'ADVAJRA_VERSION', '1.0.0' );
define( 'ADVAJRA_FILE', __FILE__ );
define( 'ADVAJRA_PATH', plugin_dir_path( __FILE__ ) );
define( 'ADVAJRA_URL', plugin_dir_url( __FILE__ ) );
define( 'ADVAJRA_BASENAME', plugin_basename( __FILE__ ) );


if ( file_exists( ADVAJRA_PATH . 'vendor/autoload.php' ) ) {
	require_once ADVAJRA_PATH . 'vendor/autoload.php';
}

/**
 * Main instance of AdVajra.
 *
 * @since 1.0.0
 * @return \AdVajra\Core\Plugin
 */
function advajra() {
	return \AdVajra\Core\Plugin::instance();
}


$GLOBALS['advajra'] = advajra();
