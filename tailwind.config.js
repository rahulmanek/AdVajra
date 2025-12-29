/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  important: '#advajra-app', // CRITICAL: Scopes styles to our app wrapper to override WP styles safely
  corePlugins: {
    preflight: false, // CRITICAL: Disables global reset to prevent breaking WP Admin styles
  },
  theme: {
    extend: {
      colors: {
        // Brand tokens (CSS vars live in src/scss/base/_variables.scss)
        primary: 'var(--av-primary)', // Semantic Primary Color
        gold: 'var(--av-accent-gold)',
        slate: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            600: '#475569',
            800: '#1e293b',
            900: '#0f172a',
        }
      },
    },
  },
  plugins: [],
}
