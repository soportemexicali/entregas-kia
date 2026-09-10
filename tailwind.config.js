/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        kianavy: {
          DEFAULT: '#0B1B2B',
          light: '#16304A',
          dark: '#060F19',
        },
        kiared: {
          DEFAULT: '#C8102E',
          dark: '#9E0C23',
          light: '#E23A54',
        },
      },
    },
  },
  plugins: [],
}
