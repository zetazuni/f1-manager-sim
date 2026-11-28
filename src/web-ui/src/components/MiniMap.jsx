import React, { useEffect, useMemo, useRef } from 'react';
import { makeTrackPath } from '../game/trackPath';

const SVGNS = 'http://www.w3.org/2000/svg';

/**
 * Live track map: outline plus a dot per car. Dots are moved every animation
 * frame straight on the SVG (no React render per frame).
 * carsRef.current: [{ id, color, lapFloat, isPlayer }]
 */
const MiniMap = ({ carsRef, points, focusId }) => {
  const dotsRef = useRef(null);
  const focusRef = useRef(focusId);
  useEffect(() => {
    focusRef.current = focusId;
  }, [focusId]);

  const geo = useMemo(() => {
    const path = makeTrackPath(points, 200);
    const xs = path.points.map((p) => p.x);
    const ys = path.points.map((p) => p.z);
    const pad = 8;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    return {
      path,
      viewBox: `${minX} ${minY} ${Math.max(...xs) + pad - minX} ${Math.max(...ys) + pad - minY}`,
      d: `${path.points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.z.toFixed(1)}`).join(' ')} Z`,
    };
  }, [points]);

  useEffect(() => {
    const g = dotsRef.current;
    if (!g) return undefined;
    const dots = new Map();
    let raf = 0;
    const tick = () => {
      const cars = carsRef.current || [];
      const seen = new Set();
      // draw the focused car last so it sits on top
      const ordered = [...cars].sort((a, b) => (a.id === focusRef.current) - (b.id === focusRef.current));
      ordered.forEach((c) => {
        seen.add(c.id);
        let dot = dots.get(c.id);
        if (!dot) {
          dot = document.createElementNS(SVGNS, 'circle');
          dot.setAttribute('fill', c.id === 'safety-car' ? '#f59e0b' : c.color);
          dot.setAttribute('stroke', c.isPlayer ? '#22d3ee' : '#05080f');
          dot.setAttribute('stroke-width', c.isPlayer ? '1.8' : '0.8');
          dot.setAttribute('r', c.isPlayer || c.id === 'safety-car' ? '3.2' : '2.4');
          dots.set(c.id, dot);
        }
        g.appendChild(dot); // re-append keeps draw order
        const p = geo.path.pointAt(c.lapFloat);
        dot.setAttribute('cx', p.x.toFixed(1));
        dot.setAttribute('cy', p.z.toFixed(1));
        dot.setAttribute('stroke', c.id === focusRef.current ? '#ffffff' : c.isPlayer ? '#22d3ee' : '#05080f');
      });
      dots.forEach((dot, id) => {
        if (!seen.has(id)) {
          dot.remove();
          dots.delete(id);
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      dots.forEach((d) => d.remove());
    };
  }, [carsRef, geo]);

  return (
    <div className="pointer-events-none absolute bottom-8 right-3 z-hud w-40 rounded-lg border border-line bg-ink/75 p-2 backdrop-blur sm:w-48" data-testid="minimap">
      <svg viewBox={geo.viewBox} className="h-auto w-full" aria-label="Live track map">
        <path d={geo.d} fill="none" stroke="#334155" strokeWidth="5" strokeLinejoin="round" />
        <path d={geo.d} fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeLinejoin="round" />
        <g ref={dotsRef} />
      </svg>
    </div>
  );
};

export default MiniMap;
