/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#137fec',
                    dark: '#0c5bb5',
                    hover: '#0e62b8',
                },
                'background-light': '#f6f7f8',
                'background-dark': '#101922',
                'surface-light': '#ffffff',
                'surface-dark': '#1a2632',
                'border-light': '#e7edf3',
                'border-dark': '#2a3b4d',
                'slate-850': '#151f2b',
            },
            fontFamily: {
                display: ['Lexend', 'sans-serif'],
                body: ['Noto Sans', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0.25rem',
                lg: '0.5rem',
                xl: '0.75rem',
                '2xl': '1rem',
                full: '9999px',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}
