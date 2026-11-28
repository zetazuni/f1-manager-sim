import React, { useMemo, useRef, useState } from 'react';
import HQView from './HQView';
import { roomOfArea } from '../game/hq';
import {
  STATS, PARTS, SIZES, FACILITIES, FACILITY_STEPS, MAX_LEVEL, MAX_WORKS, carRating, sponsorGoalFor,
  researchQuote, buildQuote, researchSlots, buildSlots, fittedGain,
} from '../game/factory';

// Bullet chart scale: car stats live between about 0.80 and 1.00
const LO = 0.8;
const HI = 1.0;
const pct = (v) => `${Math.max(0, Math.min(100, ((v - LO) / (HI - LO)) * 100))}%`;
const SERIES = '#0ea5c6'; // validated against the dark panel (dataviz validator: all checks pass)

const money = (m) => `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(1)}M`;
const races = (n) => `${n} race${n === 1 ? '' : 's'}`;
const partLabel = (key) => PARTS.find((p) => p.key === key).label;

const Tile = ({ label, children, sub }) => (
  <div className="panel p-4">
    <p className="label">{label}</p>
    <div className="mt-1 font-display text-3xl font-bold leading-none">{children}</div>
    {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
  </div>
);

/** Our car per area (bar) against the grid best (white tick) and grid average (grey tick). */
const PerformanceChart = ({ rows, us }) => {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="panel-title">Our car by area</h3>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: SERIES }} />{us}</span>
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
                <td className="py-1.5 text-right font-mono text-muted">{(r.best * 100).toFixed(1)}</td>
                <td className="py-1.5 text-right font-mono text-muted">{(r.avg * 100).toFixed(1)}</td>
                <td className="py-1.5 text-right font-mono">P{r.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="space-y-3" data-testid="perf-chart">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3 py-1" title={`Us ${(r.value * 100).toFixed(1)} | best ${(r.best * 100).toFixed(1)} (${r.bestTeam}) | average ${(r.avg * 100).toFixed(1)}`}>
              <span className="text-sm text-cream/75">{r.label}</span>
              <div className="relative h-4">
                <div className="absolute inset-x-0 inset-y-1.5 rounded-full bg-ink" />
                <div className="absolute inset-y-0.5 left-0 rounded-r-[4px]" style={{ width: pct(r.value), background: SERIES }} />
                <div className="absolute -inset-y-0.5 w-0.5 bg-slate-200" style={{ left: pct(r.best) }} />
                <div className="absolute inset-y-0 w-0.5 bg-muted" style={{ left: pct(r.avg) }} />
              </div>
              <span className="text-right font-mono text-sm">P{r.rank}</span>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-muted">Scale 80 to 100. Power unit and ERS come from the engine supplier.</p>
        </div>
      )}
    </section>
  );
};

const Bar = ({ done, total }) => (
  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2">
    <div className="h-full rounded-full" style={{ width: `${((done + 0.15) / total) * 100}%`, background: SERIES }} />
  </div>
);

const Job = ({ title, kind, left, total }) => (
  <div className="rounded-lg border border-line bg-ink/50 p-3">
    <div className="flex items-baseline justify-between gap-2">
      <p className="font-display text-sm font-bold">{title}</p>
      <p className="shrink-0 text-xs text-muted">{kind} | {races(left)} left</p>
    </div>
    <Bar done={total - left} total={total} />
  </div>
);

/** One row of the development table: what is fitted, spares and the next step. */
const PartRow = ({ part, state, onResearch, onBuild, onSpares, onVisit }) => {
  const p = state.parts[part.key];
  const design = state.designs[part.key];
  const researching = state.research.find((r) => r.part === part.key);
  const building = state.builds.find((b) => b.part === part.key && b.kind === 'upgrade');
  const sparesComing = state.builds.find((b) => b.part === part.key && b.kind === 'spares');
  const spare = Math.max(0, p.units - 2);
  const short = [0, 1].filter((seat) => fittedGain(p, seat) !== p.gain);
  const spareQuote = buildQuote(state, p.version === 0 ? null : p.size, 1);
  const linesFull = state.builds.length >= buildSlots(state);

  return (
    <tr className="border-t border-line align-top">
      <td className="py-2 pr-3">
        <button type="button" data-visit={part.key} className="cursor-pointer text-left hover:text-lantern" title="Show this department" onClick={() => onVisit(part.room)}>
          <p className="font-bold">{part.label}</p>
          <p className="text-[11px] text-muted">{part.hint}</p>
        </button>
      </td>
      <td className="py-2 pr-3">
        <p className="font-mono text-sm">Mk {p.version + 1} <span className="text-emerald-400">+{(p.gain * 100).toFixed(1)}</span></p>
        {short.length > 0 && <p className="text-[11px] text-rose">Car {short.map((s) => s + 1).join(' and ')} on {p.version === 0 ? 'a repaired part' : 'the old part'}</p>}
      </td>
      <td className="py-2 pr-3">
        <p className={`font-mono text-sm ${spare === 0 ? 'text-amber-300' : ''}`} data-spares={part.key}>{spare} spare{spare === 1 ? '' : 's'}</p>
        {sparesComing ? (
          <p className="text-[11px] text-muted">{sparesComing.qty} on the way</p>
        ) : (
          <button type="button" data-spare={part.key} className="btn btn-ghost mt-1 px-2 py-1 text-[11px]" disabled={linesFull || state.budget < spareQuote.cost || p.units >= 6} title={linesFull ? 'Every production line is busy' : `Ready in ${races(spareQuote.rounds)}`} onClick={() => onSpares(part.key)}>
            Make one ${spareQuote.cost.toFixed(1)}M
          </button>
        )}
      </td>
      <td className="py-2">
        {researching && <p className="text-sm text-muted">Researching: {races(researching.roundsLeft)} left</p>}
        {building && <p className="text-sm text-muted">Manufacturing {building.qty}: {races(building.roundsLeft)} left</p>}
        {design && (
          <div>
            <p className="text-[11px] text-lantern">{SIZES[design.size].label} design ready. How many?</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {[2, 3, 4].map((qty) => {
                const quote = buildQuote(state, design.size, qty);
                return (
                  <button key={qty} type="button" data-build={`${part.key}-${qty}`} className="btn btn-primary px-2 py-1 text-[11px]" disabled={linesFull || state.budget < quote.cost} title={`Ready in ${races(quote.rounds)}`} onClick={() => onBuild(part.key, qty)}>
                    {qty} for ${quote.cost.toFixed(1)}M
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!researching && !building && !design && (
          <div className="grid grid-cols-3 gap-1">
            {Object.values(SIZES).map((s) => {
              const quote = researchQuote(state, part.key, s.key);
              const reason = state.research.length >= researchSlots(state) ? 'The design office is full' : state.budget < quote.cost ? 'Not enough budget' : null;
              return (
                <button key={s.key} type="button" data-research={`${part.key}-${s.key}`} disabled={!!reason} title={reason || `Research ${races(quote.rounds)}, then build in ${races(s.build)}`} onClick={() => onResearch(part.key, s.key)} className="btn btn-ghost flex-col gap-0 px-1 py-1 text-[11px]">
                  <span>{s.label} +{(s.gain * 100).toFixed(1)}</span>
                  <span className="font-mono text-muted">${quote.cost.toFixed(1)}M | {quote.rounds}+{s.build}</span>
                </button>
              );
            })}
          </div>
        )}
      </td>
    </tr>
  );
};

const FactoryView = ({ season, teams, playerTeamId, onAction, quality }) => {
  const me = season.teams[playerTeamId];
  const team = teams.find((t) => t.id === playerTeamId);
  const [message, setMessage] = useState(null);
  const [room, setRoom] = useState(null); // null = automatic tour
  const viewRef = useRef(null);
  const visit = (id) => {
    setRoom(id);
    viewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const rows = useMemo(() => STATS.map((a) => {
    const values = teams.map((t) => ({ id: t.id, short: t.short, v: season.teams[t.id].car[a.key] }));
    const sorted = [...values].sort((x, y) => y.v - x.v);
    return {
      key: a.key, label: a.label, value: me.car[a.key],
      best: sorted[0].v, bestTeam: sorted[0].short,
      avg: values.reduce((s, x) => s + x.v, 0) / values.length,
      rank: sorted.findIndex((x) => x.id === playerTeamId) + 1,
    };
  }), [season, teams, me, playerTeamId]);

  const ratings = teams.map((t) => ({ id: t.id, r: carRating(season.teams[t.id].car) })).sort((a, b) => b.r - a.r);
  const myRank = ratings.findIndex((x) => x.id === playerTeamId) + 1;
  const goal = sponsorGoalFor(season.round);
  const recent = [...season.ledger].reverse().slice(0, 14);

  const act = (kind, args, okText, roomId) => {
    const res = onAction(kind, ...args);
    setMessage(res.ok ? { type: 'ok', text: okText } : { type: 'err', text: res.reason });
    if (res.ok && roomId) visit(roomId);
  };
  const research = (part, size) => act('research', [part, size], `${partLabel(part)}: research started.`, roomOfArea(part));
  const build = (part, qty) => act('build', [part, qty], `${partLabel(part)}: manufacturing ${qty}.`, 'factory');
  const spares = (part) => act('spares', [part, 1], `${partLabel(part)}: a spare is being made.`, 'factory');
  const upgrade = (id) => act('facility', [id], `${FACILITIES.find((f) => f.id === id).label}: builders have moved in.`, id);

  const jobs = me.research.length + me.builds.length + me.works.length;

  return (
    <div className="screen-enter space-y-5" data-testid="hq">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Development budget" sub="Research, parts and buildings, topped up after each race">
          <span className="text-emerald-400" data-testid="budget">{money(me.budget)}</span>
        </Tile>
        <Tile label="Car rating" sub={`P${myRank} of ${teams.length} on the grid`}>{carRating(me.car).toFixed(1)}</Tile>
        <Tile label="Design and production" sub="Research slots | production lines">
          <span className="text-xl">{me.research.length}/{researchSlots(me)} researching | {me.builds.length}/{buildSlots(me)} building</span>
        </Tile>
        <Tile label="Next sponsor objective" sub={`Worth $${goal.reward}M`}><span className="text-xl">{goal.label}</span></Tile>
      </div>

      <div ref={viewRef}>
        <HQView team={team} state={me} room={room} onRoom={setRoom} quality={quality} />
      </div>

      {message && <p className={`panel p-3 text-sm ${message.type === 'ok' ? 'text-emerald-300' : 'text-amber-300'}`} data-testid="hq-message">{message.text}</p>}
      {season.news?.length > 0 && (
        <div className="panel space-y-1 p-4">
          {season.news.map((n, i) => (
            <p key={i} className={`text-sm ${n.type === 'warning' ? 'text-amber-300' : 'text-emerald-300'}`}>{n.text}</p>
          ))}
        </div>
      )}

      <section className="panel p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="panel-title">Car development</h3>
          <p className="text-xs text-muted">Research, then manufacture. Two cars need two of every part; a crash destroys some, so keep spares.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm" data-testid="catalogue">
            <thead>
              <tr className="label text-left"><th className="pb-2">Part</th><th className="pb-2">On the car</th><th className="pb-2">Store</th><th className="pb-2">Next step (cost | research + build races)</th></tr>
            </thead>
            <tbody>
              {PARTS.map((part) => (
                <PartRow key={part.key} part={part} state={me} onResearch={research} onBuild={build} onSpares={spares} onVisit={visit} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="panel-title">Facilities</h3>
          <p className="text-xs text-muted">{me.works.length} of {MAX_WORKS} building sites busy</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="facilities">
          {FACILITIES.map((f) => {
            const at = me.facilities[f.id];
            const work = me.works.find((w) => w.id === f.id);
            const step = FACILITY_STEPS[at + 1];
            return (
              <div key={f.id} className="rounded-lg border border-line bg-ink/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="cursor-pointer text-left font-display font-bold hover:text-lantern" data-room-card={f.id} onClick={() => visit(f.id)}>{f.label}</button>
                  <span className="flex gap-1" aria-label={`Level ${at} of ${MAX_LEVEL}`} data-level={`${f.id}-${at}`}>
                    {Array.from({ length: MAX_LEVEL }, (_, i) => <span key={i} className={`h-2 w-4 rounded-sm ${i < at ? 'bg-lantern' : 'bg-line-2'}`} />)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">{f.effect}</p>
                {work ? (
                  <p className="mt-2 text-xs text-lantern">Building level {work.to}: {races(work.roundsLeft)} left</p>
                ) : step ? (
                  <button type="button" data-facility={f.id} className="btn btn-ghost mt-2 w-full py-1.5 text-xs" disabled={me.works.length >= MAX_WORKS || me.budget < step.cost} onClick={() => upgrade(f.id)}>
                    Upgrade to level {at + 1}: ${step.cost}M, {races(step.rounds)}
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-emerald-300">Top level</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <PerformanceChart rows={rows} us={team?.short || 'Us'} />
        <section className="panel p-5">
          <h3 className="panel-title mb-3">In progress</h3>
          {jobs === 0 && <p className="text-sm text-muted">Nothing under way. Start some research above.</p>}
          <div className="space-y-3" data-testid="in-progress">
            {me.research.map((r) => <Job key={`r-${r.part}`} title={partLabel(r.part)} kind="Research" left={r.roundsLeft} total={r.rounds} />)}
            {me.builds.map((b, i) => <Job key={`b-${b.part}-${i}`} title={`${partLabel(b.part)} x${b.qty}`} kind={b.kind === 'spares' ? 'Spares' : 'Manufacturing'} left={b.roundsLeft} total={b.rounds} />)}
            {me.works.map((w) => <Job key={`w-${w.id}`} title={FACILITIES.find((f) => f.id === w.id).label} kind="Building work" left={w.roundsLeft} total={w.rounds} />)}
          </div>
          <h3 className="panel-title mb-2 mt-5">Ledger</h3>
          <div className="max-h-64 overflow-y-auto" data-testid="ledger">
            {recent.length === 0 && <p className="text-sm text-muted">No money moved yet.</p>}
            {recent.map((l, i) => (
              <div key={i} className="flex items-center gap-3 border-t border-line py-1 text-xs">
                <span className="w-8 font-mono text-muted">R{l.round}</span>
                <span className="flex-1 text-cream/75">{l.label}</span>
                <span className={`font-mono ${l.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{l.amount >= 0 ? '+' : ''}{money(l.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FactoryView;
