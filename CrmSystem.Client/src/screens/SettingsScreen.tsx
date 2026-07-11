import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Palette } from 'lucide-react';

interface ThemeSettings {
  background: string;
  accentColor: string;
}

const PRESET_THEMES = [
  {
    name: 'Cyan Ocean',
    description: 'Modern cyan with deep navy',
    previewBackground: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f172a 100%)',
    background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f172a 100%)',
    accentColor: '#06b6d4'
  },
  {
    name: 'Purple Galaxy',
    description: 'Rich purple tones',
    previewBackground: 'linear-gradient(135deg, #1a0033 0%, #330066 50%, #1a0033 100%)',
    background: 'linear-gradient(135deg, #1a0033 0%, #330066 50%, #1a0033 100%)',
    accentColor: '#a78bfa'
  },
  {
    name: 'Emerald Forest',
    description: 'Calm green tones',
    previewBackground: 'linear-gradient(135deg, #0d2818 0%, #1a4d2e 50%, #0d2818 100%)',
    background: 'linear-gradient(135deg, #0d2818 0%, #1a4d2e 50%, #0d2818 100%)',
    accentColor: '#10b981'
  },
  {
    name: 'Rose Gold',
    description: 'Elegant rose and gold',
    previewBackground: 'linear-gradient(135deg, #3d1a1a 0%, #5a2a2a 50%, #3d1a1a 100%)',
    background: 'linear-gradient(135deg, #3d1a1a 0%, #5a2a2a 50%, #3d1a1a 100%)',
    accentColor: '#f87171'
  },
  {
    name: 'Slate Professional',
    description: 'Classic professional look',
    previewBackground: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    accentColor: '#3b82f6'
  },
  {
    name: 'Midnight Deep',
    description: 'Pure dark elegance',
    previewBackground: 'linear-gradient(135deg, #000000 0%, #1a1a2e 50%, #000000 100%)',
    background: 'linear-gradient(135deg, #000000 0%, #1a1a2e 50%, #000000 100%)',
    accentColor: '#06b6d4'
  }
];

export const SettingsScreen: React.FC = () => {
  const isHexColor = (value: string): boolean => /^#([a-f\d]{6})$/i.test(value);

  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('crm-theme');
    return saved
      ? JSON.parse(saved)
      : { accentColor: PRESET_THEMES[0].accentColor, background: PRESET_THEMES[0].background };
  });
  const [customAccentColor, setCustomAccentColor] = useState(theme.accentColor);
  const [customBackgroundColor, setCustomBackgroundColor] = useState(() => {
    return isHexColor(theme.background) ? theme.background : '#ffffff';
  });

  useEffect(() => {
    const root = document.documentElement;

    // Update CSS variables for page background and accent color.
    root.style.setProperty('--page-background', theme.background);
    root.style.setProperty('--accent-primary', theme.accentColor);
    root.style.setProperty('--accent-glow', `rgba(${hexToRgb(theme.accentColor)}, 0.5)`);

    if (isLightBackground(theme.background)) {
      root.style.setProperty('--text-primary', '#111827');
      root.style.setProperty('--text-secondary', '#475569');
    } else {
      root.style.setProperty('--text-primary', '#f1f5f9');
      root.style.setProperty('--text-secondary', '#cbd5e1');
    }

    // Save to localStorage
    localStorage.setItem('crm-theme', JSON.stringify(theme));
  }, [theme]);

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return '6, 182, 212';
  };

  const handlePresetTheme = (preset: typeof PRESET_THEMES[0]) => {
    setTheme({
      background: preset.background,
      accentColor: preset.accentColor
    });
    setCustomAccentColor(preset.accentColor);
    setCustomBackgroundColor(isHexColor(preset.background) ? preset.background : '#ffffff');
  };

  const handleAccentColorChange = (color: string) => {
    setCustomAccentColor(color);
    setTheme(prev => ({
      ...prev,
      accentColor: color
    }));
  };

  const handleBackgroundColorChange = (color: string) => {
    setCustomBackgroundColor(color);
    setTheme(prev => ({
      ...prev,
      background: color
    }));
  };

  const resetTheme = () => {
    const defaultTheme = PRESET_THEMES[0];
    setTheme({
      background: defaultTheme.background,
      accentColor: defaultTheme.accentColor
    });
    setCustomAccentColor(defaultTheme.accentColor);
    setCustomBackgroundColor(isHexColor(defaultTheme.background) ? defaultTheme.background : '#ffffff');
  };

  const isLightBackground = (background: string): boolean => {
    const hexMatch = /^#([a-f\d]{6})$/i.exec(background);
    if (hexMatch) {
      const r = parseInt(hexMatch[1].slice(0, 2), 16);
      const g = parseInt(hexMatch[1].slice(2, 4), 16);
      const b = parseInt(hexMatch[1].slice(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 190;
    }
    return false;
  };

  return (
    <Layout>
      <div className="screen-header">
        <div>
          <h1 className="screen-title">Settings</h1>
          <p className="screen-subtitle">Customize your CRM experience.</p>
        </div>
      </div>

      {/* Theme Customization Card */}
      <Card className="p-6 mt-6">
        <div className="settings-section">
          <div className="flex items-center gap-3 mb-6">
            <Palette size={24} style={{ color: 'var(--accent-primary)' }} />
            <h2 className="text-xl font-semibold">Theme Customization</h2>
          </div>

          {/* Preset Themes */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Preset Themes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRESET_THEMES.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => handlePresetTheme(preset)}
                  style={{
                    background: preset.previewBackground,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: theme.accentColor === preset.accentColor ? `2px solid ${preset.accentColor}` : '2px solid transparent',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem',
                    transform: theme.accentColor === preset.accentColor ? 'scale(1.05)' : 'scale(1)'
                  }}
                  className="preset-theme hover:shadow-lg"
                >
                  <div style={{ color: 'white' }}>
                    <p className="font-semibold text-sm">{preset.name}</p>
                    <p className="text-xs opacity-80">{preset.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Accent Color */}
          <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Custom Page Background</h3>
            <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center">
              <input
                type="color"
                value={customBackgroundColor}
                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                style={{
                  width: '80px',
                  height: '80px',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer'
                }}
              />
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Page Background</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Choose the full page background color. White is supported here.
                </p>
                <p style={{ color: theme.accentColor, marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {customBackgroundColor}
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={resetTheme}>Reset to Default</Button>

            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Custom Dashboard Accent</h3>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={customAccentColor}
                onChange={(e) => handleAccentColorChange(e.target.value)}
                style={{
                  width: '80px',
                  height: '80px',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer'
                }}
              />
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard Accent</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Select the accent color used for dashboard buttons, highlights, and UI elements.
                </p>
                <p style={{ color: theme.accentColor, marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {customAccentColor}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-6 mt-6" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          ✓ Your theme preferences are automatically saved and will persist across sessions.
        </p>
      </Card>
    </Layout>
  );
};
