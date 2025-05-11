// client/src/components/BatchTimer.js
import React, { useState, useEffect, useRef } from 'react';

const BatchTimer = ({ startTime, batchDuration = 1, stopped = false }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    // Clear existing interval if any
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (stopped) {
      setTimeLeft('Completed');
      return;
    }

    const updateTimer = () => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const elapsedSeconds = Math.floor((now - start) / 1000);
      const batchSeconds = batchDuration * 60;
      const currentBatch = Math.floor(elapsedSeconds / batchSeconds);
      const nextBatchTime = start + (currentBatch + 1) * batchSeconds * 1000;
      const secondsLeft = Math.max(0, Math.floor((nextBatchTime - now) / 1000));
      
      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft % 60;
      
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Initial update
    updateTimer();
    
    // Set up interval
    timerIntervalRef.current = setInterval(updateTimer, 1000);
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [startTime, batchDuration, stopped]);

  return (
    <span className={`batch-timer ${timeLeft === 'Completed' ? 'completed' : ''}`}>
      <span className="timer-label">Next batch:</span>
      <span className="timer-value">{timeLeft}</span>
    </span>
  );
};

export default BatchTimer;