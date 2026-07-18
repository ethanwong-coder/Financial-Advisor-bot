import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0f766e", // teal-700
          dark: "#115e59",
        },
      },
    },
  },
  plugins: [],
};

export default config;
