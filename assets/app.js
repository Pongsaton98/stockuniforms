tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#1d4ed8',
        'primary-dark': '#1e3a8a',
        accent: '#38bdf8',
        success: '#0ea5e9',
        info: '#0f172a',
        surface: '#eff6ff',
        'surface-strong': '#dbeafe',
      },
      fontFamily: {
        prompt: ['"Prompt"', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        card: '0 20px 45px rgba(15, 23, 42, 0.08)',
        soft: '0 8px 30px rgba(15, 23, 42, 0.06)',
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at top, rgba(56, 189, 248, 0.25), transparent 60%)',
      },
    },
  },
};
