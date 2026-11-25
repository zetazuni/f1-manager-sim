import React, { useMemo, useState } from 'react';
import { AREAS, TIERS, CAPACITY, CEILING, projectCost, carRating, sponsorGoalFor } from '../game/factory';

// Bullet chart scale: car stats live between about 0.80 and 1.00
const LO = 0.8;
const HI = 1.0;
const pct = (v) => `${Math.max(0, Math.min(100, ((v - LO) / (HI - LO)) * 100))}%`;
const SERIES = '#0ea5c6'; // validated against the dark panel (dataviz validator: all checks pass)

const money = (m) => `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;

const Tile = ({ label, children, sub }) => (
  <div className="panel p-4">
    <p className="label">{label}</p>
    <div className="mt-1 font-display text-3xl font-bold leading-none">{children}</div>
    {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
  </div>
);

/** Our car per area (bar) against the grid best (white tick) and grid average (grey tick). */
const PerformanceChart = ({ rows }) => {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="panel-title">Our car by area</h3>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: SERIES }} />Zetrace</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-slate-200" />Grid best</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-muted" />Grid average</span>
          <button type="button" className="btn btn-ghost px-2 py-1 text-[11px]" onClick={() => setAsTable((x) => !x)}>
            {asTable ? 'Chart' : 'Table'}
          </button>
        </div>
      </div>
      {asTable ? (
        <table className="w-full text-sm" data-testid="perf-table">
          <thead><tr className="label text-left"><th className="pb-1">Area</th><th className="pb-1 text-right">Us</th><th className="pb-1 text-right">Best</th><th className="pb-1 text-right">Average</th><th className="pb-1 text-right">Rank</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className="py-1.5">{r.label}</td>
                <td className="py-1.5 text-right font-mono">{(r.value * 100).toFixed(1)}</td>
                <td className="py-1.5 text-right font-mono text-slate-400">{(r.best * 100).toFixed(1)}</td>
                <td className="py-1.5 text-right font-mono text-slate-400">{(r.avg * 100).toFixed(1)}</td>
                <td className="py-1.5 text-right font-mono">P{r.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="space-y-3" data-testid="perf-chart">
          {rows.map((r) => (
            <div
              key={r.key}
              className="relative grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3 rounded py-1 hover:bg-white/[0.03]"
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="text-sm text-slate-300">{r.label}</span>
              <div className="relative h-4">
                <div className="absolute inset-y-1.5 inset-x-0 rounded-full bg-ink" />
                <div className="absolute inset-y-0.5 left-0 rounded-r-[4px]" style={{ width: pct(r.value), background: SERIES }} />
                {r.pending > 0 && (
                  <div
                    className="absolute inset-y-0.5 rounded-r-[4px] border border-dashed"
                    style={{ left: pct(r.value), width: `calc(${pct(Math.min(HI, r.value + r.pending))} - ${pct(r.value)})`, borderColor: SERIES }}
                    title="Upgrade in development"
                  />
                )}
                <div className="absolute -inset-y-0.5 w-0.5 bg-slate-200" style={{ left: pct(r.best) }} />
                <div className="absolute inset-y-0 w-0.5 bg-muted" style={{ left: pct(r.avg) }} />
              </div>
              <span className="text-right font-mono text-sm">P{r.rank}</span>
              {hover === r.key && (
                <div className="pointer-events-none absolute left-36 top-full z-hud mt-1 rounded-md border border-line-2 bg-panel-2 px-3 py-2 text-xs shadow-xl">
                  <p className="font-bold text-slate-100">{r.label}</p>
                  <p className="text-slate-300">Us {(r.value * 100).toFixed(1)} | best {(r.best * 100).toFixed(1)} ({r.bestTeam}) | average {(r.avg * 100).toFixed(1)}</p>
                  {r.pending > 0 && <p className="text-slate-400">+{(r.pending * 100).toFixed(1)} in development</p>}
                </div>
              )}
            </div>
          ))}
          <p className="pt-1 text-[11px] text-muted">Scale 80 to 100. Dashed outline = upgrades still in the factory.</p>
        </div>
      )}
    </section>
  );
};

const FactoryView = ({ season, teams, playerTeamId, onStart }) => {
  const me = season.teams[playerTeamId];
  const [message, setMessage] = useState(null);

  const rows = useMemo(() => AREAS.map((a) => {
    const values = teams.map((t) => ({ id: t.id, short: t.short, v: season.teams[t.id].car[a.key] }));
    const sorted = [...values].sort((x, y) => y.v - x.v);
    const value = me.car[a.key];
    return {
      key: a.key, label: a.label, value,
      best: sorted[0].v, bestTeam: sorted[0].short,
      avg: values.reduce((s, x) => s + x.v, 0) / values.length,
      rank: sorted.findIndex((x) => x.id === playerTeamId) + 1,
      pending: me.projects.filter((p) => p.area === a.key).reduce((s, p) => s + p.gain, 0),
    };
  }), [season, teams, me, playerTeamId]);

  const ratings = teams.map((t) => ({ id: t.id, r: carRating(season.teams[t.id].car) })).sort((a, b) => b.r - a.r);
  const myRating = carRating(me.car);
  const myRank = ratings.findIndex((x) => x.id === playerTeamId) + 1;
  const goal = sponsorGoalFor(season.round);
  const recent = [...season.ledger].reverse().slice(0, 14);

  const start = (area, tier) => {
    const res = onStart(area, tier);
    setMessage(res.ok ? { type: 'ok', text: `${TIERS[tier].label} ${AREAS.find((a) => a.key === area).label} project started.` } : { type: 'err', text: res.reason });
  };

  return (
    <div className="space-y-5" data-testid="hq">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Development budget" sub="Spent on upgrades, topped up after each race">
          <span className="text-emerald-400" data-testid="budget">{money(me.budget)}</span>
        </Tile>
        <Tile label="Car rating" sub={`P${myRank} of ${teams.length} on the grid`}>{myRating.toFixed(1)}</Tile>
        <Tile label="Factory" sub={`${CAPACITY} projects at once`}>{me.projects.length} / {CAPACITY} busy</Tile>
        <Tile label="Next sponsor objective" sub={`Worth $${goal.reward}M`}><span className="text-xl">{goal.label}</span></Tile>
      </div>

      {season.news?.length > 0 && (
        <div className="panel space-y-1 p-4">
          {season.news.map((n, i) => (
            <p key={i} className={`text-sm ${n.type === 'warning' ? 'text-amber-300' : 'text-emerald-300'}`}>{n.text}</p>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <PerformanceChart rows={rows} />

        <section className="panel p-5">
          <h3 className="panel-title mb-3">In the factory</h3>
          {me.projects.length === 0 && <p className="text-sm text-muted">Nothing in development. Pick an upgrade below.</p>}
          <div className="space-y-3">
            {me.projects.map((p) => {
              const done = p.rounds - p.roundsLeft;
              return (
                <div key={p.id} className="rounded-lg border border-line bg-ink/50 p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="font-display font-bold uppercase">{TIERS[p.tier].label} {AREAS.find((a) => a.key === p.area).label}</p>
                    <p className="text-xs text-muted">ready in {p.roundsLeft} race{p.roundsLeft > 1 ? 's' : ''}</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2">
                    <div className="h-full rounded-full" style={{ width: `${((done + 0.15) / p.rounds) * 100}%`, background: SERIES }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">+{(p.gain * 100).toFixed(1)} {p.risk ? `| ${Math.round(p.risk * 100)}% risk the gain is halved` : ''}</p>
                </div>
              );
            })}
          </div>
          <h3 className="panel-title mb-2 mt-5">Ledger</h3>
          <div className="max-h-64 overflow-y-auto" data-testid="ledger">
            {recent.length === 0 && <p className="text-sm text-muted">No money moved yet.</p>}
            {recent.map((l, i) => (
              <div key={i} className="flex items-center gap-3 border-t border-line py-1 text-xs">
                <span className="w-8 font-mono text-muted">R{l.round}</span>
                <span className="flex-1 text-slate-300">{l.label}</span>
                <span className={`font-mono ${l.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{l.amount >= 0 ? '+' : ''}{money(l.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="panel-title">Upgrade catalogue</h3>
          {message && <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-300' : 'text-amber-300'}`} data-testid="hq-message">{message.text}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm" data-testid="catalogue">
            <thead>
              <tr className="label text-left">
                <th className="pb-2">Area</th>
                {Object.values(TIERS).map((t) => (
                  <th key={t.key} className="pb-2 text-center">{t.label} (+{(t.gain * 100).toFixed(1)}, {t.rounds} race{t.rounds > 1 ? 's' : ''}{t.risk ? ', risky' : ''})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AREAS.map((a) => {
                const value = me.car[a.key];
                const busy = me.projects.some((p) => p.area === a.key);
                return (
                  <tr key={a.key} className="border-t border-line">
                    <td className="py-2 pr-3">
                      <p className="font-bold">{a.label}</p>
                      <p className="text-[11px] text-muted">{a.hint} | now {(value * 100).toFixed(1)}</p>
                    </td>
                    {Object.values(TIERS).map((t) => {
                      const cost = projectCost(t.key, value);
                      const reason = busy ? 'Already in development'
                        : me.projects.length >= CAPACITY ? 'Factory is full'
                          : value >= CEILING ? 'At the limit'
                            : me.budget < cost ? 'Not enough budget' : null;
                      return (
                        <td key={t.key} className="px-1 py-2 text-center">
                          <button
                            type="button"
                            data-upgrade={`${a.key}-${t.key}`}
                            disabled={!!reason}
                            title={reason || `Start: $${cost}M`}
                            onClick={() => start(a.key, t.key)}
                            className="btn btn-ghost w-full px-2 py-2 text-xs"
                          >
                            ${cost.toFixed(1)}M
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FactoryView;
