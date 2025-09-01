/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'wiof-home': '#fbb0ac',
        'wiof-home-light': '#c1a182',
        'wiof-earth': '#bded81',
        'wiof-energy': '#ffebb8',
        'wiof-air': '#e0caf5',
        'wiof-water': '#dff3ff',
        'wiof-spirit': '#f1dec6',
      }
    },
  },
  plugins: [],
}

