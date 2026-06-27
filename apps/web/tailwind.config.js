export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Satoshi", "Noto Sans SC", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        sentinel: {
          ink: "#0b1714",
          panel: "#f4f7f5",
          line: "#c8d5ce",
          mint: "#62c7a2",
          risk: "#d63c32",
          amber: "#c88420",
        },
      },
    },
  },
  plugins: [],
};