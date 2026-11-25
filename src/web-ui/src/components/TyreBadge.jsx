import React from 'react';
import { COMPOUNDS } from '../game/tyres';

/** Round tyre badge in the compound colour, like a TV graphic. */
const TyreBadge = ({ compound, size = 'sm', title }) => {
  const c = COMPOUNDS[compound];
  const dim = size === 'lg' ? 'h-7 w-7 text-xs' : 'h-5 w-5 text-[10px]';
  return (
    <span
      title={title || c.name}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full border-[3px] bg-slate-950 font-black leading-none`}
      style={{ borderColor: c.color, color: c.color }}
    >
      {c.key}
    </span>
  );
};

export default TyreBadge;
