/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#060709',
          900: '#0B0C0E', // Reference obsidian background
          850: '#101216',
          800: '#16181F', // Card surface
          750: '#1D2029',
          700: '#252934',
        },
        gold: {
          50: '#FBF8EE',
          100: '#F7F0D6',
          200: '#EFE0AC',
          300: '#E5CE7E',
          400: '#DBBC53',
          500: '#E5A93C', // Reference vibrant champagne gold
          600: '#CD8E27',
          700: '#A46B18',
          800: '#7F5016',
          900: '#523310',
        },
        fintech: {
          bg: '#0B0C0E',
          surface: '#121418',
          cardBorder: '#232730',
        },
        brand: {
          50: '#f0f7ff',
          100: '#e0f0fe',
          200: '#bae2fd',
          300: '#7cc7fb',
          400: '#38a8f8',
          500: '#0070BA',
          600: '#005ea6',
          700: '#003087',
          800: '#00266e',
          900: '#001a4e',
        }
      },
      boxShadow: {
        'gold-glow': '0 0 25px -4px rgba(229, 169, 60, 0.35)',
        'gold-glow-lg': '0 0 40px -2px rgba(229, 169, 60, 0.45)',
        'card-dark': '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
