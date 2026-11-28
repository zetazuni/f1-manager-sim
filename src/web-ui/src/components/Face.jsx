import React from 'react';
import { FACES, FREE_AGENTS, GRID_TEAMS } from '../data/season';

// driver name -> photo (only a private season pack has any)
const BY_NAME = new Map(
  [...GRID_TEAMS.flatMap((t) => t.drivers), ...FREE_AGENTS]
    .filter((d) => FACES[d.code])
    .map((d) => [d.name, FACES[d.code]]),
);

/** A driver's face, or nothing when there is no photo for this name. */
const Face = ({ name, className = 'h-8 w-8' }) => {
  const src = BY_NAME.get(name);
  if (!src) return null;
  return <img src={src} alt="" className={`shrink-0 rounded-full bg-white/10 object-cover ${className}`} />;
};

export default Face;
