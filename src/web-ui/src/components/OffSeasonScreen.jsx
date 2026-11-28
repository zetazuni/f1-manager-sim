import React, { useState } from 'react';
import { driverRating, salaryAsk, marketList } from '../game/career';
import MoraleMeter from './MoraleMeter';
import Face from './Face';

const Stars = ({ potential }) => {
  // scouting is not exact: show potential as stars rounded to halves
  const stars = Math.max(1, Math.min(5, Math.round(((potential - 80) / 4) * 2) / 2));
  return (
    <span className="text-gold" title={`Scout estimate: ${stars} of 5`}>
      {'★'.repeat(Math.floor(stars))}{stars % 1 ? '½' : ''}<span className="text-line-2">{'★'.repeat(5 - Math.ceil(stars))}</span>
    </span>
  );
};

/**
 * Off-season: re-sign or replace drivers, then start the next season.
 * teamPos = our constructors position (weaker teams pay more).
 */
const OffSeasonScreen = ({ season, playerTeamId, teamPos, onSign, onStart, teamName = (id) => id }) => {
  const [msg, setMsg] = useState(null);
  const [years, setYears] = useState(2);
  const career = season.career;
  const lineup = career.lineups[playerTeamId];
  const market = marketList(career, playerTeamId);
  const budget = season.teams[playerTeamId].budget;

  const sign = (driverId, seat) => {
    const res = onSign(driverId, seat, years);
    const d = career.drivers[driverId];
    setMsg(res.ok ? { ok: true, text: `${d.name} signed for ${years} year${years > 1 ? 's' : ''}.` } : { ok: false, text: res.reason });
  };

  return (
    <div className="screen-enter space-y-5" data-testid="offseason">
      <div className="panel flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <p className="label">Off-season</p>
          <h2 className="display text-4xl">Driver market {career.year + 1}</h2>
          <p className="text-sm text-muted">Contracts ran down by a year. Re-sign your drivers or bring in someone new. Signing bonus = half a year of salary, paid now.</p>
        </div>
        <div className="text-right">
          <p className="label">Development budget</p>
          <p className="font-display text-3xl font-bold text-emerald-400" data-testid="market-budget">${budget.toFixed(1)}M</p>
        </div>
      </div>

      {season.offseasonNews?.length > 0 && (
        <div className="panel p-4 text-sm text-amber-200">{season.offseasonNews.map((n) => <p key={n}>{n}</p>)}</div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section className="panel space-y-3 p-5">
          <h3 className="panel-title">Your drivers</h3>
          {lineup.map((id, seat) => {
            const d = id ? career.drivers[id] : null;
            if (!d) {
              return (
                <div key={seat} className="rounded-lg border border-dashed border-line-2 p-4 text-sm text-muted">
                  Seat {seat + 1} is empty. Sign a driver from the market, or the team will pick the cheapest one available.
                </div>
              );
            }
            const expired = d.contract?.years <= 0;
            return (
              <div key={id} className={`rounded-lg border p-4 ${expired ? 'border-amber-400/50 bg-amber-400/5' : 'border-line bg-panel-2/50'}`}>
                <div className="flex items-baseline justify-between">
                  <p className="flex items-center gap-2 font-display text-xl font-bold"><Face name={d.name} className="h-12 w-12" />{d.name}</p>
                  <p className="font-mono text-sm">{driverRating(d)} <span className="text-muted">ovr</span></p>
                </div>
                <p className="text-xs text-muted">Age {d.age} | <Stars potential={d.potential} /> | ${(d.salary / 1e6).toFixed(1)}M a year</p>
                <p className="mt-1"><MoraleMeter value={d.morale} /></p>
                <p className={`mt-1 text-xs ${expired ? 'text-amber-300' : 'text-muted'}`}>
                  {expired ? 'Contract ended: re-sign or the driver leaves' : `Contract: ${d.contract.years} more year${d.contract.years > 1 ? 's' : ''}`}
                </p>
                {expired && (
                  <button type="button" data-resign={id} onClick={() => sign(id, seat)} className="btn btn-ghost mt-2 w-full text-xs">
                    Re-sign for ${salaryAsk(d, teamPos).toFixed(1)}M a year
                  </button>
                )}
              </div>
            );
          })}
          <div>
            <p className="label mb-2">Contract length for new signings</p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((y) => (
                <button key={y} type="button" onClick={() => setYears(y)} className={`chip ${years === y ? 'bg-lantern text-ink' : 'chip-off'}`}>
                  {y} year{y > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
          {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-amber-300'}`} data-testid="market-msg">{msg.text}</p>}
          <button type="button" data-testid="start-next-season" onClick={onStart} className="btn btn-primary w-full py-4 text-base">
            Start the {career.year + 1} season
          </button>
        </section>

        <section className="panel p-5">
          <h3 className="panel-title mb-3">Available drivers</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm" data-testid="market">
              <thead>
                <tr className="label text-left">
                  <th className="pb-2">Driver</th><th className="pb-2 text-right">Age</th><th className="pb-2 text-right">Rating</th>
                  <th className="pb-2 pl-3">Potential</th><th className="pb-2 text-right">Asks</th><th className="pb-2 text-center">Sign to</th>
                </tr>
              </thead>
              <tbody>
                {market.map((d) => {
                  const ask = salaryAsk(d, teamPos);
                  const tooDear = ask * 0.5 > budget;
                  return (
                    <tr key={d.id} className="border-t border-line">
                      <td className="py-2">
                        <p className="flex items-center gap-2 font-bold"><Face name={d.name} className="h-8 w-8" />{d.name}</p>
                        <p className="flex items-center gap-2 text-[11px] text-muted">
                          {d.contract ? `Leaving ${teamName(d.contract.teamId)}` : 'Free agent'}
                          <MoraleMeter value={d.morale} compact />
                        </p>
                      </td>
                      <td className="py-2 text-right font-mono">{d.age}</td>
                      <td className="py-2 text-right font-mono">{driverRating(d)}</td>
                      <td className="py-2 pl-3"><Stars potential={d.potential} /></td>
                      <td className="py-2 text-right font-mono">${ask.toFixed(1)}M</td>
                      <td className="py-2">
                        <div className="flex justify-center gap-1">
                          {[0, 1].map((seat) => (
                            <button
                              key={seat}
                              type="button"
                              data-sign={`${d.id}-${seat}`}
                              disabled={tooDear}
                              title={tooDear ? 'Signing bonus is more than the budget' : `Replace seat ${seat + 1}`}
                              onClick={() => sign(d.id, seat)}
                              className="btn btn-ghost px-2 py-1 text-[11px]"
                            >
                              Seat {seat + 1}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OffSeasonScreen;
