import React, { useState } from 'react';
import { isDesktop, quitGame, toggleFullscreen } from '../services/desktop';

const Choice = ({ label, value, options, onChange, testId }) => (
  <div>
    <p className="label mb-2">{label}</p>
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          data-setting={`${testId}-${o.value}`}
          onClick={() => onChange(o.value)}
          className={`chip ${value === o.value ? 'bg-lantern text-ink' : 'chip-off'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

/**
 * Settings: graphics quality, sound, music, default race speed, career reset.
 * The reset asks twice inside the dialog (no browser popups).
 */
const SettingsDialog = ({ open, settings, onChange, onClose, onResetCareer }) => {
  const [confirmReset, setConfirmReset] = useState(false);
  if (!open) return null;
  const set = (k) => (v) => onChange({ [k]: v });
  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="panel w-full max-w-md space-y-5 bg-panel p-6" data-testid="settings">
        <div className="flex items-center justify-between">
          <h2 className="display text-2xl">Settings</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost px-3 py-1.5 text-xs" data-testid="settings-close">Done</button>
        </div>
        <Choice
          label="Graphics quality"
          testId="quality"
          value={settings.quality}
          onChange={set('quality')}
          options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]}
        />
        <p className="-mt-3 text-[11px] text-muted">Low turns shadows off and renders at standard resolution: use it on older laptops.</p>
        <Choice label="Sound" testId="sound" value={settings.sound} onChange={set('sound')} options={[{ value: true, label: 'On' }, { value: false, label: 'Off' }]} />
        <Choice label="Lofi music" testId="music" value={settings.music} onChange={set('music')} options={[{ value: 'normal', label: 'Normal' }, { value: 'low', label: 'Low' }, { value: 'off', label: 'Off' }]} />
        <Choice
          label="Default race speed"
          testId="speed"
          value={settings.speed}
          onChange={set('speed')}
          options={[{ value: 1, label: '1x' }, { value: 2, label: '2x' }, { value: 4, label: '4x' }]}
        />
        {isDesktop && (
          <div>
            <p className="label mb-2">Window (F11 for fullscreen, Esc to leave it)</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost" onClick={toggleFullscreen}>Fullscreen on / off</button>
              <button type="button" className="btn btn-ghost" onClick={quitGame}>Quit game</button>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-line bg-ink/60 p-4">
          <p className="label">Career</p>
          <p className="mt-1 text-sm text-cream/75">
            Saved automatically on this computer after every change.
          </p>
          {!confirmReset ? (
            <button type="button" className="btn btn-ghost mt-3 w-full" data-testid="reset-1" onClick={() => setConfirmReset(true)}>
              Start a new career
            </button>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Keep career</button>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="reset-2"
                onClick={() => { setConfirmReset(false); onResetCareer(); }}
              >
                Yes, wipe it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
