/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(15,23,42,0.35)',
      },
      colors: {
        ink: '#09111f',
        panel: '#101a2d',
        panelSoft: '#16233b',
        accent: '#ff8a4c',
        mint: '#43d9ad',
        warn: '#fbbf24',
        danger: '#f87171',
      },
      fontFamily: {
        display: ['"Manrope"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
