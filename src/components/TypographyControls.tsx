import React from 'react';
import { Settings, Maximize, FileText } from 'lucide-react';
import './TypographyControls.css';

export interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  theme: 'light' | 'dark' | 'sepia';
  readingMode: 'spread' | 'scrolled';
}

interface Props {
  settings: TypographySettings;
  onChange: (newSettings: TypographySettings) => void;
  onClose: () => void;
}

const TypographyControls: React.FC<Props> = ({ settings, onChange, onClose }) => {
  const updateSetting = <K extends keyof TypographySettings>(key: K, value: TypographySettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="typography-overlay">
      <div className="typography-panel">
        <div className="typography-header">
          <h3><Settings size={18} /> Display Settings</h3>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>

        <div className="setting-group">
          <label>Theme</label>
          <div className="theme-options">
            <button 
              className={`theme-btn light ${settings.theme === 'light' ? 'active' : ''}`}
              onClick={() => updateSetting('theme', 'light')}
            >Light</button>
            <button 
              className={`theme-btn sepia ${settings.theme === 'sepia' ? 'active' : ''}`}
              onClick={() => updateSetting('theme', 'sepia')}
            >Sepia</button>
            <button 
              className={`theme-btn dark ${settings.theme === 'dark' ? 'active' : ''}`}
              onClick={() => updateSetting('theme', 'dark')}
            >Dark</button>
          </div>
        </div>

        <div className="setting-group">
          <label>Font Size ({settings.fontSize}%)</label>
          <div className="size-controls">
            <button className="icon-btn" onClick={() => updateSetting('fontSize', Math.max(50, settings.fontSize - 10))}>A-</button>
            <input 
              type="range" 
              min="50" max="250" step="10" 
              value={settings.fontSize}
              onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
            />
            <button className="icon-btn" onClick={() => updateSetting('fontSize', Math.min(250, settings.fontSize + 10))}>A+</button>
          </div>
        </div>

        <div className="setting-group">
          <label>Font Family</label>
          <select 
            value={settings.fontFamily} 
            onChange={(e) => updateSetting('fontFamily', e.target.value)}
            className="font-select"
          >
            <option value="Inter, sans-serif">Inter (Sans-serif)</option>
            <option value="Georgia, serif">Georgia (Serif)</option>
            <option value="Times New Roman, serif">Times New Roman</option>
            <option value="OpenDyslexic, sans-serif">OpenDyslexic</option>
          </select>
        </div>

        <div className="setting-group">
          <label>Reading Mode</label>
          <div className="mode-options">
            <button 
              className={`mode-btn ${settings.readingMode === 'spread' ? 'active' : ''}`}
              onClick={() => updateSetting('readingMode', 'spread')}
              title="Two-Page Spread"
            >
              <FileText size={18} /> Spread
            </button>
            <button 
              className={`mode-btn ${settings.readingMode === 'scrolled' ? 'active' : ''}`}
              onClick={() => updateSetting('readingMode', 'scrolled')}
              title="Continuous Scroll"
            >
              <Maximize size={18} /> Scroll
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypographyControls;
