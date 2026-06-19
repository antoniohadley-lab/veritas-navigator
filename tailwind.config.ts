import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        veritas: {
          blue: '#1e3a5f',
          teal: '#2a7d7b',
          light: '#f0f4f8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
