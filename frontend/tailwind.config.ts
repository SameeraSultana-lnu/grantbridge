import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        clay: '#f3ede3',
        ink: '#1a1a1a',
        moss: '#2f5d50',
        apricot: '#f7a35c',
        fog: '#fbf9f5',
      },
      boxShadow: {
        card: '0 14px 30px -16px rgba(26, 26, 26, 0.35)',
      },
      fontFamily: {
        display: ['\"Space Grotesk\"', 'sans-serif'],
        body: ['\"DM Sans\"', 'sans-serif'],
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 500ms ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
