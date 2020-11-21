/* eslint-env node */
module.exports = {
  purge: [
    "./src/**/*.html",
    "./src/**/*.md",
    "./src/**/*.mdx",
    "./src/**/*.jsx",
    "./src/**/*.js",
    "./src/**/*.tsx",
    "./src/**/*.ts",
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};