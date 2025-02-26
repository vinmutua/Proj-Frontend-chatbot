/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/flowbite/**/*.js",
    'node_modules/preline/dist/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        'capriola': ['Capriola', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'nunito-sans': ['Nunito Sans', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
      },
      animation: {
        flip: "flipY 5.5s infinite linear",
      },
      keyframes: {
        flipY: {
          "0%, 70%": { transform: "rotateX(-45deg)" },
          "50%": { transform: "rotateY(150deg)" },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('flowbite/plugin')
  ],
}

