/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--color-primary)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
        },
        surface: "var(--color-surface)",
        card: "var(--color-card)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(to right, var(--color-gradient-from), var(--color-gradient-to))',
      },
      boxShadow: {
        'glow': '0 0 20px var(--color-glow)',
        'glow-sm': '0 0 10px var(--color-glow)',
      },
    },
  },
  plugins: [],
}
