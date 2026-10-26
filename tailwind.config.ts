import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(52, 60, 73, 0.8), 0 20px 50px rgba(0, 0, 0, 0.24)',
      },
      colors: {
        brand: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#ff8a3d', 600: '#f97316', 700: '#c2410c',
          800: '#9a3412', 900: '#7c2d12',
        },
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at top, rgba(255,138,61,0.16), transparent 48%)',
      },
    },
  },
  plugins: [],
};

export default config;
