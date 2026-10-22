/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: '#F6F2EA',
          50: '#FAF8F4',
          100: '#F6F2EA',
          200: '#EDE5D5',
          300: '#E1D4BD',
        },
        forest: {
          DEFAULT: '#263C34',
          50: '#F0F4F2',
          100: '#DCE5E1',
          500: '#3D5F52',
          700: '#2F4B41',
          800: '#263C34',
          900: '#1A2924',
          950: '#0F1815',
        },
        gold: {
          DEFAULT: '#B79562',
          50: '#F9F6F0',
          100: '#F1E9DB',
          200: '#E2D1B5',
          300: '#D4B98E',
          400: '#C5A371',
          500: '#B79562',
          600: '#9E7E4E',
          700: '#7E643D',
        },
        charcoal: {
          DEFAULT: '#272724',
          50: '#F7F7F6',
          100: '#E3E3E1',
          500: '#52524D',
          700: '#363632',
          800: '#272724',
          900: '#1A1A18',
        },
        mutedgray: '#77766F',
        bordercolor: '#E7E2D9',
        status: {
          success: '#287A52',
          warning: '#B7791F',
          error: '#B42318',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Playfair Display', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 10px 30px -10px rgba(38, 60, 52, 0.08), 0 4px 6px -2px rgba(38, 60, 52, 0.04)',
        'luxury-lg': '0 20px 40px -15px rgba(38, 60, 52, 0.12), 0 8px 16px -4px rgba(38, 60, 52, 0.06)',
      },
    },
  },
  plugins: [],
};
