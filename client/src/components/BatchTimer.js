// BatchTimer.js
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Timer component for showing countdown to batch completion
const BatchTimer = ({ startTime, batchDuration = 5 }) => {
  const { language } = useLanguage();
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    // Calculate time left until next batch completion
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      
      // Calculate elapsed time in minutes since batch started
      const elapsedMinutes = (now - start) / (1000 * 60);
      
      // Calculate which batch is in progress
      const completedBatches = Math.floor(elapsedMinutes / batchDuration);
      const nextBatchCompleteTime = start + ((completedBatches + 1) * batchDuration * 60 * 1000);
      
      // Calculate time left until next batch completion
      let diff = nextBatchCompleteTime - now;
      
      // If less than 30 seconds left, show "completing" animation
      if (diff > 0 && diff < 30000) {
        setIsCompleting(true);
      } else {
        setIsCompleting(false);
      }
      
      // Convert to minutes and seconds
      if (diff > 0) {
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        return { minutes, seconds };
      }
      
      // Default to next batch if time already passed
      return { minutes: batchDuration, seconds: 0 };
    };

    // Set initial time
    setTimeLeft(calculateTimeLeft());

    // Update timer every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, batchDuration]);

  return (
    <div className={`batch-timer ${isCompleting ? 'completing' : ''}`}>
      <div className="timer-label">
        {language === 'vi' ? 'Lô tiếp theo:' : 'Next batch in:'}
      </div>
      <div className="timer-value">
        {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </div>
    </div>
  );
};

export default BatchTimer;