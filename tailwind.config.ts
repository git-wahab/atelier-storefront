import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bone: "#F2F1EE", // page background
        paper: "#FAF9F7", // lighter panels
        ink: "#111113", // text, buttons, footer
        body: "#4A4A50", // running text
        muted: "#5F5F65", // captions
        bronze: "#86543D", // the one accent
        plate: "#2B2B2E", // behind photographs
        line: "rgb(17 17 19 / 0.14)", // hairlines
        "dark-soft": "#C9C8C4",
        "dark-dim": "#A9A9AE",
        "dark-accent": "#D8A98F",
      },
      fontFamily: {
        serif: ['"Instrument Serif"', '"Times New Roman"', "serif"],
        sans: ['"Hanken Grotesk"', "system-ui", "sans-serif"],
      },
      letterSpacing: {
        cap: "0.2em",
        btn: "0.18em",
      },
      maxWidth: {
        page: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
