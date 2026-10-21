import { newLedger, addGoal, complete, progress } from '../streaks';
import { useEffect, useRef, useState } from 'react';
// Illustrative data only. Providers are fictional; no activity is tracked.
const demoGoals = [
  { id: 'javascript', name: 'Learn JavaScript', lesson: 'Functions & scope', source: 'Example coding course', days: 12, current: 13, total: 20, unit: 'min', accent: 'amber', symbol: '{ }' },
  { id: 'spanish', name: 'Practice Spanish', lesson: 'Everyday conversations', source: 'Example language course', days: 4, current: 0, total: 1, unit: 'lesson', accent: 'purple', symbol: 'Aa' },
  { id: 'reading', name: 'Read something new', lesson: 'The art of paying attention', source: 'Example reading course', days: 7, current: 1, total: 1, unit: 'lesson', accent: 'green', symbol: '≡' },
] as const;

type DemoGoal = (typeof demoGoals)[number];
export type PreviewState = 'sample' | 'empty' | 'loading';


export function Brand() {
  return <div className="brand"><img src="/icon/48.png" width="34" height="34" alt="" /><span>Streak<span className="brand-light"> / daily</span></span></div>;
}

export function PreviewControl({ value, onChange }: { value: PreviewState; onChange: (value: PreviewState) => void }) {
  return <label className="preview-control">Preview state
    <select value={value} onChange={(event) => onChange(event.target.value as PreviewState)}>
      <option value="sample">Sample goals</option><option value="empty">Empty</option><option value="loading">Loading</option>
    </select>
  </label>;
}

export function GoalList({ state }: { state: PreviewState }) {
  const [selected, setSelected] = useState<DemoGoal | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);
  return <>
    {state === 'loading' ? <div role="status" className="loading-state">
      <span className="sr-only">Loading preview goals</span>
      {[1, 2, 3].map((item) => <div key={item} className="skeleton" aria-hidden="true"><span /><span /></div>)}
    </div> : state === 'empty' ? <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">↗</span><h3>Your next chapter starts here.</h3>
      <p>Your daily goals will appear here. Switch to Sample goals to explore the design.</p>
    </div> : <div className="goal-list">
      {demoGoals.map((goal) => {
        const complete = goal.current === goal.total;
        return <article className={`goal-card ${complete ? 'is-complete' : ''}`} key={goal.id}>
          <div className={`goal-symbol ${goal.accent}`} aria-hidden="true">{goal.symbol}</div>
          <div className="goal-content">
            <div className="goal-title-row"><h3>{goal.name}</h3><span className="streak-count"><span aria-hidden="true">↗</span> {goal.days} days</span></div>
            <p className="lesson">{goal.lesson}</p>
            <div className="progress-row"><progress aria-label={`${goal.name} example progress`} max={goal.total} value={goal.current} /><span>{goal.current}/{goal.total} {goal.unit}</span></div>
            <p className="evidence">{goal.source} · Browser tracked · example</p>
          </div>
          <button className={`button ${complete ? 'button-quiet' : 'button-outline'} goal-action`} onClick={() => setSelected(goal)}
            aria-label={`${complete ? 'View' : 'Continue'} ${goal.name} demo`}>
            {complete ? 'Done' : 'Continue'} <span aria-hidden="true">{complete ? '✓' : '→'}</span>
          </button>
        </article>;
      })}
    </div>}
    <dialog ref={dialog} className="goal-dialog" aria-labelledby="lesson-title" onClose={() => setSelected(null)}>
      <p className="eyebrow">Sample lesson</p><h2 id="lesson-title">{selected?.lesson}</h2>
      <p>This is a design preview. In the finished app, Continue will reopen your saved lesson at the supported position.</p>
      <div className="dialog-note">No website is connected and no progress or points have been recorded.</div>
      <form method="dialog"><button className="button">Back to my day</button></form>
    </dialog>
  </>;
}

export function DaySummary() {
  return <section className="day-summary" aria-label="Example daily summary">
    <div><p className="eyebrow">A little every day</p><h2>Keep showing up.</h2><p>One goal down. Two small steps to go.</p></div>
    <div className="day-ring" role="img" aria-label="Example: 1 of 3 goals complete"><span><strong>1<span>/3</span></strong><small>complete</small></span></div>
  </section>;
}

export function StreakPreview() {
  const [scenario, setScenario] = useState('ongoing');
  const ledger = newLedger();
  const at = (day: number) => Date.UTC(2026, 0, day, 12);
  addGoal(ledger, 'sample', { timezone: 'UTC', target: 1, unit: 'lessons' }, at(1));
  for (let day = 1; day <= 7; day++) complete(ledger, 'sample', `sample-${day}`, 1, 'lessons', at(day));
  if (scenario === 'restart') complete(ledger, 'sample', 'sample-restart', 1, 'lessons', at(9));
  const result = progress(ledger, 'sample', at(scenario === 'ongoing' ? 8 : 9));
  return <section className="week-card" aria-label="Streak rules prototype">
    <p className="eyebrow">LOCAL PROTOTYPE · FICTIONAL COMPLETIONS</p>
    <h2>See how streaks work.</h2>
    <label className="preview-control">Streak scenario<select value={scenario} onChange={e => setScenario(e.target.value)}>
      <option value="ongoing">Today is still open</option><option value="missed">Yesterday was missed</option><option value="restart">Complete after a missed day</option>
    </select></label>
    <p role="status">Current: {result.current} days · Best: {result.best} days · Prototype XP: {ledger.lifetimeXP}</p>
    <p>Seven sample days earn 175 daily XP plus 20 and 50 milestone XP. Missing a day resets the current run, while best streak and XP remain.</p>
    <p className="quiet-note">Fixed January 2026 example in UTC. This preview does not change saved goals or award real points.</p>
  </section>;
}
