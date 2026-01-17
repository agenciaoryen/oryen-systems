/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // Mudamos de 'tailwindcss' para '@tailwindcss/postcss'
  },
};

export default config;