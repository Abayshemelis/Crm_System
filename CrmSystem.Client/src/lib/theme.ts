export interface ThemePreset {
  id: string;
  name: string;
  tagline: string;
  mode: 'dark' | 'light';
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  pageBg: string;
  accentPrimary: string;
  accentHover: string;
  accentGlow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderColor: string;
  borderHighlight: string;
  glassBg: string;
  glassBorder: string;
  previewGradient: string;
  badge: string;
}

export const ATTRACTIVE_THEMES: ThemePreset[] = [
  {
    id: 'espresso-amber',
    name: 'Espresso Charcoal Gold',
    tagline: 'Dark warm espresso-charcoal with amber gold metrics and sleek borders',
    mode: 'dark',
    bgPrimary: '#15131a',
    bgSecondary: '#1f1c25',
    bgTertiary: '#2a2632',
    pageBg: '#15131a',
    accentPrimary: '#f59e0b',
    accentHover: '#d97706',
    accentGlow: 'rgba(245, 158, 11, 0.4)',
    textPrimary: '#f8fafc',
    textSecondary: '#a0a5b8',
    textMuted: '#64748b',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderHighlight: 'rgba(245, 158, 11, 0.35)',
    glassBg: 'rgba(31, 28, 37, 0.92)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    previewGradient: 'linear-gradient(135deg, #15131a 0%, #1f1c25 50%, #f59e0b 100%)',
    badge: 'Featured'
  },
  {
    id: 'cyber-midnight',
    name: 'Midnight Cyber',
    tagline: 'Deep space obsidian with glowing indigo-cyan neon accents',
    mode: 'dark',
    bgPrimary: '#080c14',
    bgSecondary: '#111827',
    bgTertiary: '#1f2937',
    pageBg: '#080c14',
    accentPrimary: '#6366f1',
    accentHover: '#4f46e5',
    accentGlow: 'rgba(99, 102, 241, 0.45)',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderHighlight: 'rgba(99, 102, 241, 0.4)',
    glassBg: 'rgba(17, 24, 39, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    previewGradient: 'linear-gradient(135deg, #080c14 0%, #111827 50%, #6366f1 100%)',
    badge: 'Popular'
  },
  {
    id: 'neon-violet',
    name: 'Neon Violet Glass',
    tagline: 'Luminous purple cosmos with electric violet & magenta glow',
    mode: 'dark',
    bgPrimary: '#0e0b1c',
    bgSecondary: '#17132a',
    bgTertiary: '#241e3d',
    pageBg: '#0e0b1c',
    accentPrimary: '#a855f7',
    accentHover: '#9333ea',
    accentGlow: 'rgba(168, 85, 247, 0.45)',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    borderColor: 'rgba(168, 85, 247, 0.25)',
    borderHighlight: 'rgba(236, 72, 153, 0.5)',
    glassBg: 'rgba(23, 19, 42, 0.85)',
    glassBorder: 'rgba(168, 85, 247, 0.25)',
    previewGradient: 'linear-gradient(135deg, #0e0b1c 0%, #17132a 50%, #a855f7 100%)',
    badge: 'Vibrant'
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    tagline: 'Sleek dark obsidian with mint & emerald neon highlights',
    mode: 'dark',
    bgPrimary: '#061410',
    bgSecondary: '#0d221c',
    bgTertiary: '#16332b',
    pageBg: '#061410',
    accentPrimary: '#10b981',
    accentHover: '#059669',
    accentGlow: 'rgba(16, 185, 129, 0.45)',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderHighlight: 'rgba(52, 211, 153, 0.4)',
    glassBg: 'rgba(13, 34, 28, 0.85)',
    glassBorder: 'rgba(16, 185, 129, 0.25)',
    previewGradient: 'linear-gradient(135deg, #061410 0%, #0d221c 50%, #10b981 100%)',
    badge: 'Fresh'
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber Gold',
    tagline: 'Warm executive dark charcoal with molten amber & gold accents',
    mode: 'dark',
    bgPrimary: '#17120a',
    bgSecondary: '#241c12',
    bgTertiary: '#362b1d',
    pageBg: '#17120a',
    accentPrimary: '#f59e0b',
    accentHover: '#d97706',
    accentGlow: 'rgba(245, 158, 11, 0.45)',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderHighlight: 'rgba(251, 191, 36, 0.4)',
    glassBg: 'rgba(36, 28, 18, 0.85)',
    glassBorder: 'rgba(245, 158, 11, 0.25)',
    previewGradient: 'linear-gradient(135deg, #17120a 0%, #241c12 50%, #f59e0b 100%)',
    badge: 'Warm'
  },
  {
    id: 'crimson-ruby',
    name: 'Crimson Overdrive',
    tagline: 'Stealth dark midnight with intense ruby red & flame glow',
    mode: 'dark',
    bgPrimary: '#180a10',
    bgSecondary: '#26121b',
    bgTertiary: '#3b1c2a',
    pageBg: '#180a10',
    accentPrimary: '#f43f5e',
    accentHover: '#e11d48',
    accentGlow: 'rgba(244, 63, 94, 0.45)',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    borderColor: 'rgba(244, 63, 94, 0.25)',
    borderHighlight: 'rgba(251, 113, 133, 0.4)',
    glassBg: 'rgba(38, 18, 27, 0.85)',
    glassBorder: 'rgba(244, 63, 94, 0.25)',
    previewGradient: 'linear-gradient(135deg, #180a10 0%, #26121b 50%, #f43f5e 100%)',
    badge: 'Bold'
  },
  {
    id: 'deep-ocean',
    name: 'Deep Sapphire Blue',
    tagline: 'Royal navy space with deep ocean blue & sapphire accents',
    mode: 'dark',
    bgPrimary: '#091024',
    bgSecondary: '#101a38',
    bgTertiary: '#1b2a54',
    pageBg: '#091024',
    accentPrimary: '#3b82f6',
    accentHover: '#2563eb',
    accentGlow: 'rgba(59, 130, 246, 0.45)',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderHighlight: 'rgba(96, 165, 250, 0.4)',
    glassBg: 'rgba(16, 26, 56, 0.85)',
    glassBorder: 'rgba(59, 130, 246, 0.25)',
    previewGradient: 'linear-gradient(135deg, #091024 0%, #101a38 50%, #3b82f6 100%)',
    badge: 'Classic'
  },
  {
    id: 'clean-enterprise',
    name: 'Clean Enterprise Light',
    tagline: 'Ultra-crisp white & slate with royal blue & indigo highlights',
    mode: 'light',
    bgPrimary: '#ffffff',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    pageBg: '#f8fafc',
    accentPrimary: '#4f46e5',
    accentHover: '#4338ca',
    accentGlow: 'rgba(79, 70, 229, 0.25)',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    borderColor: '#e2e8f0',
    borderHighlight: '#cbd5e1',
    glassBg: 'rgba(255, 255, 255, 0.95)',
    glassBorder: 'rgba(226, 232, 240, 0.8)',
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #4f46e5 100%)',
    badge: 'Light'
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz Light',
    tagline: 'Soft pearl white with elegant rose gold & ruby accents',
    mode: 'light',
    bgPrimary: '#ffffff',
    bgSecondary: '#ffffff',
    bgTertiary: '#fff1f2',
    pageBg: '#fffafb',
    accentPrimary: '#e11d48',
    accentHover: '#be123c',
    accentGlow: 'rgba(225, 29, 72, 0.25)',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    borderColor: '#ffe4e6',
    borderHighlight: '#fecdd3',
    glassBg: 'rgba(255, 255, 255, 0.95)',
    glassBorder: 'rgba(254, 205, 211, 0.8)',
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #fff5f7 50%, #e11d48 100%)',
    badge: 'Elegant'
  }
];

export function applyThemePreset(preset: ThemePreset) {
  const root = document.documentElement;
  root.setAttribute('data-theme', preset.mode);
  root.setAttribute('data-preset-id', preset.id);

  root.style.setProperty('--bg-primary', preset.bgPrimary);
  root.style.setProperty('--bg-secondary', preset.bgSecondary);
  root.style.setProperty('--bg-tertiary', preset.bgTertiary);
  root.style.setProperty('--page-background', preset.pageBg);
  root.style.setProperty('--accent-primary', preset.accentPrimary);
  root.style.setProperty('--accent-hover', preset.accentHover);
  root.style.setProperty('--accent-glow', preset.accentGlow);
  root.style.setProperty('--text-primary', preset.textPrimary);
  root.style.setProperty('--text-secondary', preset.textSecondary);
  root.style.setProperty('--text-muted', preset.textMuted);
  root.style.setProperty('--sidebar-text-primary', preset.textPrimary);
  root.style.setProperty('--sidebar-text-secondary', preset.textSecondary);
  root.style.setProperty('--sidebar-text-muted', preset.textMuted);
  root.style.setProperty('--border-color', preset.borderColor);
  root.style.setProperty('--border-highlight', preset.borderHighlight);
  root.style.setProperty('--glass-bg', preset.glassBg);
  root.style.setProperty('--glass-border', preset.glassBorder);

  document.documentElement.style.backgroundColor = preset.pageBg;
  document.body.style.backgroundColor = preset.pageBg;
  document.body.style.color = preset.textPrimary;

  const targets = document.querySelectorAll<HTMLElement>('#root, .layout-app, .layout-main, .main-content');
  targets.forEach(el => {
    if (el) {
      el.style.backgroundColor = preset.pageBg;
      el.style.color = preset.textPrimary;
    }
  });

  localStorage.setItem('crm-theme-preset', JSON.stringify(preset));
  localStorage.setItem('crm-theme', JSON.stringify({ mode: preset.mode, accentColor: preset.accentPrimary, background: preset.pageBg }));
}

export function initTheme() {
  try {
    const presetStr = localStorage.getItem('crm-theme-preset');
    if (presetStr) {
      const preset = JSON.parse(presetStr);
      if (preset && preset.id) {
        const found = ATTRACTIVE_THEMES.find(t => t.id === preset.id) || preset;
        applyThemePreset(found);
        return;
      }
    }
  } catch { /* ignore */ }

  applyThemePreset(ATTRACTIVE_THEMES[0]);
}
