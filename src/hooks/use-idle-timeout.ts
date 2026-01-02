
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

const useIdleTimeout = (timeout: number, onIdle: () => void) => {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutId = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    setIsIdle(false);
    timeoutId.current = setTimeout(() => {
      setIsIdle(true);
      onIdle();
    }, timeout);
  }, [timeout, onIdle]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => window.addEventListener(event, handleActivity));
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, [handleActivity]);

  return { isIdle, resetTimer };
};

export default useIdleTimeout;
