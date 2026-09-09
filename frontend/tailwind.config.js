/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta neutra e institucional — sem marca de nenhuma instituição
        // financeira (ver observação de compliance no README).
        marca: {
          50: '#eff5ff',
          100: '#dbe7fe',
          200: '#bfd4fe',
          300: '#93b8fd',
          400: '#6092fa',
          500: '#3b6df6',
          600: '#254deb',
          700: '#1d3ad8',
          800: '#1e32af',
          900: '#1e2f8a',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
