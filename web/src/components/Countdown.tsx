import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle } from 'lucide-react';

interface CountdownProps {
  proposedAt: string;
  coolingOffMinutes?: number;
  onComplete?: () => void;
}

export const Countdown: React.FC<CountdownProps> = ({
  proposedAt,
  coolingOffMinutes = 1,
  onComplete,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    const totalMs = coolingOffMinutes * 60 * 1000;
    const update = () => {
      const elapsed = Date.now() - new Date(proposedAt).getTime();
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0 && onComplete) {
        onComplete();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [proposedAt, coolingOffMinutes, onComplete]);

  if (secondsLeft === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        Cooling-off fulfilled (Ready for release)
      </span>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-300 bg-gold-500/15 px-3 py-1 rounded-full border border-gold-500/40 animate-pulse shadow-gold-glow">
      <Clock className="w-3.5 h-3.5 text-gold-400" />
      Cooling-off: {mins > 0 ? `${mins}m ` : ''}{secs}s remaining
    </span>
  );
};
