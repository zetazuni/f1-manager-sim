import React from 'react';
import { moraleLabel } from '../game/career';

const TONE = {
  Great: 'bg-emerald-400 text-emerald-300',
  Good: 'bg-data text-cyan-300',
  Okay: 'bg-amber-300 text-amber-200',
  Low: 'bg-red-500 text-red-300',
};

/** Small morale meter: a bar plus a word (never colour alone). */
const MoraleMeter = ({ value = 65, compact = false }) => {
  const label = moraleLabel(value);
  const [bar, text] = TONE[label].split(' ');
  return (
    <span className="inline-flex items-center gap-1.5" title={`Morale ${value} / 100`} data-testid="morale">
      <span className={`relative inline-block h-1.5 overflow-hidden rounded-full bg-ink ${compact ? 'w-8' : 'w-12'}`}>
        <span className={`absolute inset-y-0 left-0 rounded-full ${bar}`} style={{ width: `${value}%` }} />
      </span>
      <span className={`text-[10px] font-bold ${text}`}>{label}</span>
    </span>
  );
};

export default MoraleMeter;
