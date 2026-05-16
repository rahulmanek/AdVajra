# AdVajra — Engineering Best Practices

## Project Overview
AdVajra is a WordPress ad management plugin (Free + PRO). The free plugin provides ad creation, placement, group rotation, targeting, analytics, and delivery. The PRO plugin (advajra-pro) extends it via WordPress hooks/filters.

## Architecture

### PHP Backend (`inc/`)
- **Namespace:** `AdVajra\` with PSR-4 autoloading mapped to `inc/`
- **Entry:** `advajra.php` → `Core\Plugin` singleton
- **Layers:**
  - `Model/` — Custom post type wrappers (Ad, Group, Placement)
  - `Data/` — Default values and configuration constants
  - `API/` — REST API controllers (namespace: `advajra/v1`)
  - `Delivery/` — Frontend ad rendering pipeline (performance-critical, runs on every page load)
  - `Core/` — Admin UI, modules, cron, targeting
  - `Conditions/` — Targeting condition evaluators
  - `Display/` — Shortcodes, widgets, block rendering
  - `Features/` — Toggleable modules (bot prevention, click fraud, ad blocker detection)
  - `Integrations/` — Third-party service connectors

### React Frontend (`src/`)
- **Build:** `@wordpress/scripts` (Webpack), entry at `src/index.js`
- **Router:** `react-router-dom` HashRouter (hash-based URLs for WP admin compatibility)
- **State:** `@wordpress/data` store + React Context for UI state
- **Styling:** SCSS + Tailwind CSS, scoped under `#advajra-app`
- **Pages:** Dashboard, AdList, AdEditor, GroupList, GroupEditor, PlacementList, PlacementEdit, Settings, Analytics

### Frontend Tracking (`public/tracking.js`)
- Lightweight vanilla JS for impression/click tracking
- Runs on the public site, must be minimal and non-blocking

## Coding Standards

### PHP
- WordPress-Core coding standard (enforced by PHPCS)
- Short array syntax `[]` required (long `array()` is banned)
- PascalCase filenames (PSR-4 convention)
- No Yoda conditions
- Text domain: `advajra`
- Minimum PHP: 7.4, Minimum WP: 6.2

### JavaScript / React
- `@wordpress/scripts` ESLint config (tabs for indentation, single quotes, spaces inside brackets)
- WordPress coding style for JS: `const [ value, setValue ] = useState()` (spaces inside destructuring)
- Components use `@wordpress/components` library where possible
- API calls use `@wordpress/api-fetch`

## Critical Rules

### Security (Non-Negotiable)
- Every REST endpoint must have a `permission_callback` that checks `current_user_can()`
- All database queries must use `$wpdb->prepare()` for parameterized values
- All output must be escaped: `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`
- All form submissions must verify nonces via `wp_verify_nonce()` or `check_ajax_referer()`
- Never use `$_GET`/`$_POST` directly without sanitization (`sanitize_text_field`, `absint`, etc.)

### Performance
- `Delivery/` code runs on every frontend page load — no unnecessary DB queries, no autoloading heavy classes
- Use WordPress transient or object cache for repeated lookups
- React lazy-loading is used for all page-level components — keep chunk sizes reasonable

### PRO Plugin Compatibility
- The free plugin exposes `do_action()` and `apply_filters()` hooks that PRO depends on
- Removing or renaming hooks is a breaking change — treat as a major version bump
- PRO checks `advajra-pro` slug and extends via `advajra_pro_*` prefixed hooks

### Data Integrity
- Ad impression/click tracking must be atomic (no double-counting)
- Placement resolution order matters — do not change sort logic without testing rotation/priority
- Cache keys must include relevant context (ad ID, placement ID) to prevent cross-contamination

### Build & Release
- Always build with `npm run build` (runs `wp-scripts build` in production mode)
- Never commit the `build/` directory — it is generated
- Release packaging uses `scripts/release-package.sh`
- PHPStan (level max) and PHPCS must pass before merge
