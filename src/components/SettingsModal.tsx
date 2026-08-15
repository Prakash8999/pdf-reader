import React from 'react';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  setTheme: (theme: string) => void;
  isFocusMode: boolean;
  setFocusMode: (focus: boolean) => void;
  isBlueLightFilterEnabled: boolean;
  setBlueLightFilterEnabled: (enabled: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, theme, setTheme, isFocusMode, setFocusMode, isBlueLightFilterEnabled, setBlueLightFilterEnabled
}) => {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Reading Settings</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="settings-modal-body">
          <div className="settings-group">
            <h3>Theme</h3>
            <div className="theme-options">
              <button 
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button 
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
              <button 
                className={`theme-btn ${theme === 'sepia' ? 'active' : ''}`}
                onClick={() => setTheme('sepia')}
              >
                Sepia
              </button>
            </div>
          </div>

          <div className="settings-group toggle-group">
            <h3>Blue Light Filter</h3>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isBlueLightFilterEnabled} 
                onChange={(e) => setBlueLightFilterEnabled(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="settings-group toggle-group">
            <h3>Focus Mode</h3>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isFocusMode} 
                onChange={(e) => setFocusMode(e.target.checked)} 
              />
              <span className="slider round"></span>
            </label>
            <p className="settings-hint">Hides the sidebar to maximize screen space.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
