import React, { useMemo } from 'react';
import { makeTrackPath, pitLayout } from '../game/trackPath';

/**
 * Track outline as SVG, from the same spline the 3D view uses.
 * Top-down view with +Z drawn downwards; the start line is a red tick.
 */
const TrackMap = ({ points, className = '', stroke = '#e2e8f0', width = 5, showPit = true, pitSide = -1, title }) => {
  const geo = useMemo(() => {
    const path = makeTrackPath(points, 240);
    const xs = path.points.map((p) => p.x);
    const zs = path.points.map((p) => p.z);
    const pad = 10;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...zs) - pad;
    const w = Math.max(...xs) + pad - minX;
    const h = Math.max(...zs) + pad - minY;
    const d = `${path.points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ')} Z`;
    const pit = pitLayout(path.total, pitSide);
    const pitPts = [];
    for (let i = 0; i <= 12; i++) {
      const p = path.pointAt(pit.start + ((pit.end - pit.start) * i) / 12, pit.lateral * 0.7);
      pitPts.push(`${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    }
    const s = path.pointAt(0);
    const sn = path.pointAt(0, 6);
    const sp = path.pointAt(0, -6);
    return { d, pitD: pitPts.join(' '), k: Math.max(w, h) / 150, viewBox: `${minX} ${minY} ${w} ${h}`, start: { x1: sn.x, y1: sn.z, x2: sp.x, y2: sp.z }, s };
  }, [points, pitSide]);

  return (
    <svg viewBox={geo.viewBox} className={className} role="img" aria-label={title || 'Track map'}>
      <path d={geo.d} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth={(width + 4) * geo.k} strokeLinejoin="round" />
      <path d={geo.d} fill="none" stroke={stroke} strokeWidth={width * geo.k} strokeLinejoin="round" />
      {showPit && <path d={geo.pitD} fill="none" stroke="#facc15" strokeWidth={width * 0.35 * geo.k} strokeDasharray={`${3 * geo.k} ${2 * geo.k}`} />}
      <line {...geo.start} stroke="#e10600" strokeWidth={width * 0.8 * geo.k} strokeLinecap="round" />
    </svg>
  );
};

export default TrackMap;
