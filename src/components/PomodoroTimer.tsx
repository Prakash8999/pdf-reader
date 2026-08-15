import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X } from 'lucide-react';
import './PomodoroTimer.css';

interface PomodoroTimerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ isOpen, onClose }) => {
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setShowCompletionModal(true);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    if (isEditing) setIsEditing(false);
    if (timeLeft > 0) setIsActive(!isActive);
  };
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(duration * 60);
    setIsEditing(false);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0 && val <= 180) {
      setDuration(val);
      setTimeLeft(val * 60);
    }
  };

  const handleContinue = () => {
    setShowCompletionModal(false);
    setTimeLeft(duration * 60);
    setIsActive(true);
  };

  const handleRest = () => {
    setShowCompletionModal(false);
    setTimeLeft(duration * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;

  return (
    <div className="pomodoro-widget">
      <div className="pomodoro-header">
        <h4>Focus Timer</h4>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>
      
      <div className="pomodoro-circle">
        <svg viewBox="0 0 100 100">
          <circle className="bg-circle" cx="50" cy="50" r="45" />
          <circle 
            className="progress-circle" 
            cx="50" cy="50" r="45" 
            strokeDasharray={`${progress * 2.83} 283`}
          />
        </svg>
        <div className="pomodoro-time">
          {isEditing && !isActive ? (
            <input 
              type="number" 
              value={duration} 
              onChange={handleDurationChange}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              className="pomodoro-input"
              autoFocus
              min="1"
              max="180"
              title="Set minutes"
            />
          ) : (
            <span onClick={() => !isActive && setIsEditing(true)} style={{ cursor: !isActive ? 'pointer' : 'default' }} title={!isActive ? "Click to edit minutes" : ""}>
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      <div className="pomodoro-controls">
        <button className="icon-btn" onClick={toggleTimer} title={isActive ? "Pause" : "Start"}>
          {isActive ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="icon-btn" onClick={resetTimer} title="Reset">
          <RotateCcw size={20} />
        </button>
      </div>

      {showCompletionModal && (
        <div className="pomodoro-modal-overlay">
          <div className="pomodoro-modal">
            <h3>Session Complete!</h3>
            <p>Great job! Take a short break, or jump right into another session?</p>
            <div className="pomodoro-modal-actions">
              <button className="btn-secondary" onClick={handleRest}>Rest</button>
              <button className="btn-primary" onClick={handleContinue}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
