import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./client/src/**/*.{ts,tsx,js,jsx}",
    "./client/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
