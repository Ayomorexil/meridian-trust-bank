/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#002B72', dark: '#001A50' },
        blue: { DEFAULT: '#004FAD', mid: '#0062CC', light: '#E6EEF8' },
        brand: { DEFAULT: '#E84E0F', mid: '#FF6A2B', light: '#FFF0E8' },
        good: { DEFAULT: '#1A7A3A', light: '#E6F4EC' },
        danger: '#DC2626',
        ink: '#0D1B2A',
        muted: '#64748B',
        line: '#E2E8F0',
        surface: '#FFFFFF',
        bg: '#F0F4FA',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        sm2: '0 1px 3px rgba(0,43,114,0.08), 0 1px 2px rgba(0,43,114,0.06)',
        md2: '0 4px 16px rgba(0,43,114,0.12), 0 2px 6px rgba(0,43,114,0.08)',
        lg2: '0 12px 40px rgba(0,43,114,0.18), 0 4px 12px rgba(0,43,114,0.10)',
      },
      borderRadius: { sm2: '8px', md2: '12px', lg2: '18px' },
    },
  },
  plugins: [],
};
