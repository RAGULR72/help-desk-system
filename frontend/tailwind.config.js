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
                background: '#050505',
                surface: '#0A0A0A',
                primary: 'var(--primary)',
                'primary-hover': 'var(--primary-hover)',
                'primary-light': 'rgba(var(--primary-rgb), 0.1)',
                'primary-medium': 'rgba(var(--primary-rgb), 0.4)',
                accent: {
                    purple: '#904EFF',
                    magenta: '#E250E5',
                    blue: '#1E90FF',
                    orange: '#FF5E0E',
                },
                transparent: 'transparent',
                current: 'currentColor',
                'main': 'var(--text-main)',
                'muted': 'var(--text-muted)',
                'card-bg': 'var(--card-bg)',
                'card-border': 'var(--card-border)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            animation: {
                'gradient': 'gradient 8s linear infinite',
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'reveal': 'reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-up-fade': 'slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'scale-in': 'scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
            keyframes: {
                reveal: {
                    '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                slideUpFade: {
                    '0%': { opacity: '0', transform: 'translateY(40px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                gradient: {
                    '0%, 100%': {
                        'background-size': '200% 200%',
                        'background-position': 'left center',
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center',
                    },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%': { 'box-shadow': '0 0 5px rgba(14, 165, 233, 0.5), 0 0 20px rgba(14, 165, 233, 0.3)' },
                    '100%': { 'box-shadow': '0 0 20px rgba(14, 165, 233, 0.8), 0 0 40px rgba(14, 165, 233, 0.5)' },
                },
            },
        },
    },
    plugins: [],
}
