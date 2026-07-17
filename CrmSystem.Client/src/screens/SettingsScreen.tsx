import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Palette, Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './screens.css';

interface ThemeSettings {
  mode: 'dark' | 'light';
  accentColor: string;
}

const PRESET_THEMES = [
  {
    name: 'Cyan Ocean',
    description: 'Modern cyan with deep navy',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f172a 100%)',
    accentColor: '#06b6d4'
  },
  {
    name: 'Purple Galaxy',
    description: 'Rich purple tones',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #1a0033 0%, #330066 50%, #1a0033 100%)',
    accentColor: '#a78bfa'
  },
  {
    name: 'Emerald Forest',
    description: 'Calm green tones',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #0d2818 0%, #1a4d2e 50%, #0d2818 100%)',
    accentColor: '#10b981'
  },
  {
    name: 'Rose Gold',
    description: 'Elegant rose and gold',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #3d1a1a 0%, #5a2a2a 50%, #3d1a1a 100%)',
    accentColor: '#f87171'
  },
  {
    name: 'Slate Professional',
    description: 'Classic professional look',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    accentColor: '#3b82f6'
  },
  {
    name: 'Light Clean',
    description: 'Clean light theme',
    mode: 'light' as const,
    previewBackground: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
    accentColor: '#0284c7'
  }
];

export const SettingsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();
  const [activeTab, setActiveTab] = useState<'theme'>('theme');
  
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const mode = localStorage.getItem('theme') as 'dark' | 'light' | null;
    return {
      mode: mode || 'dark',
      accentColor: PRESET_THEMES[0].accentColor
    };
  });
  const [customAccentColor, setCustomAccentColor] = useState(theme.accentColor);

  useEffect(() => {
    const root = document.documentElement;

    // Set the theme mode (dark/light)
    root.setAttribute('data-theme', theme.mode);
    localStorage.setItem('theme', theme.mode);

    // Update accent color CSS variables
    root.style.setProperty('--accent-primary', theme.accentColor);
    root.style.setProperty('--accent-hover', adjustColorBrightness(theme.accentColor, -20));
    root.style.setProperty('--accent-glow', `rgba(${hexToRgb(theme.accentColor)}, ${theme.mode === 'light' ? '0.3' : '0.5'})`);

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
      mode: preset.mode,
      accentColor: preset.accentColor
    });
    setCustomAccentColor(preset.accentColor);
  };

  const handleAccentColorChange = (color: string) => {
    setCustomAccentColor(color);
    setTheme(prev => ({
      ...prev,
      accentColor: color
    }));
  };

  const handleModeChange = (mode: 'dark' | 'light') => {
    setTheme(prev => ({
      ...prev,
      mode
    }));
  };

  const resetTheme = () => {
    const defaultTheme = PRESET_THEMES[0];
    setTheme({
      mode: defaultTheme.mode,
      accentColor: defaultTheme.accentColor
    });
    setCustomAccentColor(defaultTheme.accentColor);
  };

  const adjustColorBrightness = (hex: string, amount: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="screen-header">
        <div>
          <h1 className="screen-title">Settings</h1>
          <p className="screen-subtitle">Customize your CRM experience.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'theme' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('theme')}
        >
          Theme
        </button>
      </div>

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <Card className="p-6">
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
                      border: theme.mode === preset.mode && theme.accentColor === preset.accentColor 
                        ? `2px solid ${preset.accentColor}` 
                        : '2px solid transparent',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1rem',
                      transform: theme.mode === preset.mode && theme.accentColor === preset.accentColor ? 'scale(1.05)' : 'scale(1)'
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

            {/* Theme Mode Toggle */}
            <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Theme Mode</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleModeChange('dark')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: theme.mode === 'dark' ? `2px solid ${theme.accentColor}` : '2px solid var(--border-color)',
                    background: theme.mode === 'dark' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Dark Mode
                </button>
                <button
                  onClick={() => handleModeChange('light')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: theme.mode === 'light' ? `2px solid ${theme.accentColor}` : '2px solid var(--border-color)',
                    background: theme.mode === 'light' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Light Mode
                </button>
              </div>
            </div>

            {/* Custom Accent Color */}
            <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Custom Accent Color</h3>
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
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Accent Color</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Select the accent color used for buttons, highlights, and UI elements.
                  </p>
                  <p style={{ color: theme.accentColor, marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {customAccentColor}
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={resetTheme} className="mt-4">Reset to Default</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="p-6 mt-6" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          ✓ Your settings are automatically saved and will persist across sessions.
        </p>
      </Card>
    </Layout>
  );
};
