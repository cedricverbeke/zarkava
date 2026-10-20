/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        stable: {
          50: '#eef2f8',
          100: '#d9e2f0',
          200: '#b4c5e0',
          300: '#8aa3cc',
          400: '#5e7eb5',
          500: '#42619e',
          600: '#324d83',
          700: '#283e6b',
          800: '#1f3257',
          900: '#172745',
          950: '#0f1a33',
        },
        gold: {
          50: '#fbf6ec',
          100: '#f5e9cc',
          200: '#ecd29a',
          300: '#e0b65f',
          400: '#d6a23c',
          500: '#c98a2a',
          600: '#ad6f22',
          700: '#8a5320',
          800: '#724221',
          900: '#613820',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(15, 26, 51, 0.08), 0 4px 20px -4px rgba(15, 26, 51, 0.06)',
        card: '0 1px 3px rgba(15, 26, 51, 0.06), 0 8px 24px -12px rgba(15, 26, 51, 0.12)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.4)' },
          '70%': { boxShadow: '0 0 0 8px rgba(220, 38, 38, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'pulse-ring': 'pulse-ring 1.8s infinite',
      },
    },
  },
  plugins: [],
};
