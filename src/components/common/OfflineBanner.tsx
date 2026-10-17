import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div className="bg-emerald-600 text-white text-xs px-4 py-1.5 flex items-center justify-center gap-2 shadow-sm transition-all animate-fade-in z-50">
        <Wifi className="w-3.5 h-3.5" />
        <span>Connected back online. Local records synchronized.</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-600 text-white text-xs px-4 py-1.5 flex items-center justify-center gap-2 shadow-sm transition-all z-50">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — All records and captures are safely saved to your local browser storage.</span>
    </div>
  );
};
