import React from 'react';

/**
 * The five-light start gantry. `lit` = number of red lights on (0-5),
 * or 'out' for the moment they all go dark.
 */
const StartLights = ({ lit }) => {
  if (lit === null || lit === undefined) return null;
  const out = lit === 'out';
  return (
    <div className="pointer-events-none absolute inset-0 z-hud flex items-start justify-center pt-8" data-testid="start-lights">
      <div className="flex gap-3 rounded-xl border border-line-2 bg-ink/90 px-5 py-4 shadow-2xl">
        {[1, 2, 3, 4, 5].map((i) => {
          const on = !out && lit >= i;
          return (
            <div key={i} className="flex flex-col gap-2 rounded-md bg-black/70 p-2">
              {[0, 1].map((row) => (
                <span
                  key={row}
                  className={`block h-7 w-7 rounded-full transition-colors duration-75 ${
                    on ? 'bg-red-600 shadow-[0_0_18px_4px_rgba(239,68,68,0.75)]' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          );
        })}
      </div>
      {out && <p className="absolute top-36 font-display text-4xl font-bold italic tracking-widest text-white drop-shadow-lg">LIGHTS OUT</p>}
    </div>
  );
};

export default StartLights;
