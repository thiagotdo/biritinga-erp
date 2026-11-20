import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primaria:    'var(--cor-primaria)',
        secundaria:  'var(--cor-secundaria)',
        acento:      'var(--cor-acento)',
      },
    },
  },
  plugins: [],
}

export default config
