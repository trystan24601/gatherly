// Frontend-local Tailwind config.
// Extends the root config but fixes content paths to be relative to this directory.
const rootConfig = require('../tailwind.config.js')

module.exports = {
  ...rootConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
  ],
}
