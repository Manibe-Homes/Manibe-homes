/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Navy palette
        earth: {
          50:  '#f0f1f5',
          100: '#dce0ea',
          200: '#b8c0d4',
          300: '#8894b0',
          400: '#5e6d8c',
          500: '#3d4f72',
          600: '#2c3a5c',
          700: '#1e2a45',
          800: '#141d34',
          900: '#0c1524',
        },
        // Gold palette
        gold: {
          400: '#dbc06a',
          500: '#c4a95a',
          600: '#ad944c',
        },
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
