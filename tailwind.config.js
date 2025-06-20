/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        nutrient: {
          primary: '#1a1414',
          secondary: '#efebe7',
          background: '#ffffff',
        },
      },
      height: {
        'editor': '64rem', // 1024px equivalent
      },
    },
  },
  plugins: [],
};