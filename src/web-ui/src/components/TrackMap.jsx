import React, { useMemo } from 'react';
import { makeTrackPath, pitLayout } from '../game/trackPath';

/**
 * Track outline as SVG, from the same spline the 3D view uses.
 * Top-down view with +Z drawn upwards; the start line is a red tick.
 */
const TrackMap = ({ points, className = '', stroke = '#e2e8f0', width = 5, showPit = true, title }) => {
  const geo = useMemo(() => {
    const path = makeTrackPath(points, 240);
    const xs = path.points.map((p) => p.x);
    const zs = path.points.map((p) => -p.z);
    const pad = 10;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...zs) - pad;
    const w = Math.max(...xs) + pad - minX;
    const h = Math.max(...zs) + pad - minY;
    const d = `${path.points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${(-p.z).toFixed(1)}`).join(' ')} Z`;
    const pit = pitLayout(path.total);
    const pitPts = [];
    for (let i = 0; i <= 12; i++) {
      const p = path.pointAt(pit.start + ((pit.end - pit.start) * i) / 12, pit.lateral * 0.7);
      pitPts.push(`${i ? 'L' : 'M'}${p.x.toFixed(1)},${(-p.z).toFixed(1)}`);
    }
    const s = path.pointAt(0);
    const sn = path.pointAt(0, 6);
    const sp = path.pointAt(0, -6);
    return { d, pitD: pitPts.join(' '), viewBox: `${minX} ${minY} ${w} ${h}`, start: { x1: sn.x, y1: -sn.z, x2: sp.x, y2: -sp.z }, s };
  }, [points]);

  return (
    <svg viewBox={geo.viewBox} className={className} role="img" aria-label={title || 'Track map'}>
      <path d={geo.d} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth={width + 4} strokeLinejoin="round" />
      <path d={geo.d} fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round" />
      {showPit && <path d={geo.pitD} fill="none" stroke="#facc15" strokeWidth={width * 0.35} strokeDasharray="3 2" />}
      <line {...geo.start} stroke="#e10600" strokeWidth={width * 0.8} strokeLinecap="round" />
    </svg>
  );
};

export default TrackMap;
