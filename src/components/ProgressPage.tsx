import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { useGoals } from '../goals';
import { localDate, MILESTONES, progress } from '../streaks';
import { monthDays, type CloudHistory, type HistoryRecord } from '../history';
import { useReading } from './Connection';

export function ProgressPage({ rewards = false }: { rewards?: boolean }) {
  const { store, error: goalsError } = useGoals();
  const { data, error: readingError } = useReading();
  const [source, setSource] = useState('device');
  const [goalId, setGoalId] = useState('');
  const [month, setMonth] = useState(() => localDate(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 7));
  const [cloud, setCloud] = useState<CloudHistory | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, refresh] = useState(0);
  useEffect(() => {
    if (source !== 'cloud') return;
    let alive = true;
    setCloud(null); setError(''); setBusy(true);
    void browser.runtime.sendMessage({ type: 'cloud', action: 'history', payload: { month, goalId } }).then(result => {
      if (!alive) return;
      if (!result?.ok) throw new Error(result?.error ?? 'History is unavailable.');
      setCloud(result.state);
    }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setBusy(false); });
    // Discard account history immediately when credentials change, including in another tab.
    const changed = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && Object.keys(changes).some(k => k.startsWith('auth:'))) {
        alive = false; setCloud(null); refresh(r => r + 1);
      }
    };
    browser.storage.onChanged.addListener(changed);
    return () => { alive = false; browser.storage.onChanged.removeListener(changed); };
  }, [source, goalId, month, revision]);
  const goals = source === 'device' ? (store?.goals ?? []).map(g => ({ id: g.id, name: g.name, status: g.archived ? 'archived' : 'active' })) : cloud?.goals ?? [];
  const selected = goals.find(g => g.id === goalId) ?? goals[0];
  let record: HistoryRecord | null = source === 'cloud' ? cloud?.record ?? null : null;
  if (source === 'device' && data && selected) {
    const ledger = data.state.ledger, saved = ledger.goals[selected.id];
    const at = Math.max(Date.now(), ledger.clock);
    const p = saved ? progress(ledger, selected.id, at) : null;
    const timezone = p?.rule.timezone ?? data.state.timezone;
    record = { current: p?.current ?? 0, best: p?.best ?? 0, xp: p?.xp ?? 0,
      today: localDate(at, timezone), timezone, completedToday: p?.completedToday ?? false,
      days: saved?.completions.map(c => c.date) ?? [], milestones: saved?.milestones ?? [] };
  }
  const failure = source === 'device' ? goalsError || readingError : error;
  const loading = source === 'device' ? (!store || !data) && !failure : busy;
  return <section className="progress-page" aria-label={rewards ? 'Milestone rewards' : 'Completion history'}>
    <div className="history-toolbar">
      <label>Progress source<select value={source} onChange={e => { setSource(e.target.value); setGoalId(''); setCloud(null); }}><option value="device">This device</option><option value="cloud">Cloud account</option></select></label>
      {!!goals.length && <label>Goal<select aria-label="Goal" value={selected?.id ?? ''} onChange={e => setGoalId(e.target.value)}>{goals.map(g => <option key={g.id} value={g.id}>{g.name}{g.status === 'archived' ? ' (archived)' : ''}</option>)}</select></label>}
      {source === 'cloud' && <button className="button button-outline" disabled={busy} onClick={() => refresh(r => r + 1)}>Refresh history</button>}
    </div>
    <p className="quiet-note">{source === 'device' ? 'Device prototype · Browser tracked. Local XP is separate from account rewards.' : 'Cloud records · Browser tracked. Only accepted completions appear here; pending submissions stay on Today.'}</p>
    {failure && <p role="alert" className="dialog-note">{failure} {source === 'device' ? 'Reload this page to retry.' : 'Use Settings to sign in or check your setup, then refresh.'}</p>}
    {loading ? <p role="status">Loading progress…</p> : !failure && !selected ? <div className="empty-state"><h2>Your story starts with a goal.</h2><p>{source === 'device' ? 'Create your first daily goal, then connect a supported website.' : 'Copy your goal definitions from Settings to start cloud tracking.'}</p><a className="button button-outline" href={source === 'device' ? '#today' : '#settings'}>{source === 'device' ? 'Create a goal' : 'Open Settings'}</a></div> : record && selected && <>
      <div className="section-heading"><div><h2>{selected.name}</h2><p>{selected.status === 'archived' ? 'Archived · History preserved' : source === 'device' ? data?.allowed && data.state.goalId === selected.id ? 'GeeksforGeeks · Connected' : 'Not connected on this device' : 'Account goal'} · {record.timezone}</p></div></div>
      <dl className="progress-stats"><div><dt>Current streak</dt><dd>{record.current}<small> days</small></dd></div><div><dt>Personal best</dt><dd>{record.best}<small> days</small></dd></div><div><dt>{source === 'device' ? 'Local goal XP' : 'Cloud goal XP'}</dt><dd>{record.xp}</dd></div></dl>
      <p role="status">{selected.status === 'archived' ? 'Past completions remain part of your history.' : record.completedToday ? 'Today is complete. A little effort, another day earned.' : record.current === 0 && record.best > 0 ? 'Your next completion starts a new streak. Your best streak and earned XP stay.' : 'Today is still open. Complete your daily target to add a day.'}</p>
      {rewards ? <>
        <p>Daily completions earn 25 XP. Each milestone bonus is awarded once per goal, even after a reset.</p>
        <div className="reward-grid">{MILESTONES.map(([days, xp]) => {
          const earned = record.milestones.includes(days);
          return <article className={`reward-card${earned ? ' earned' : ''}`} key={days}><span className="eyebrow">{earned ? '✓ EARNED' : 'NEXT CHAPTER'}</span><h3>{days} days</h3><strong>+{xp} XP</strong><p>{earned ? 'This reward stays with you.' : `${Math.max(0, days - record.current)} more consecutive days`}</p><progress aria-label={`${days} day milestone`} max={days} value={earned ? days : Math.min(days, record.current)} /></article>;
        })}</div>
      </> : <section className="week-card history-calendar">
        <label>Calendar month<input type="month" value={month} min="2000-01" max="2100-12" onChange={e => { if (/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(e.target.value)) setMonth(e.target.value); }} /></label>
        <table><caption>{month} · {record.days.filter(d => d.startsWith(month)).length} completed days</caption><thead><tr>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <th scope="col" key={d}>{d}</th>)}</tr></thead>
          <tbody>{monthDays(month).map((week, i) => <tr key={i}>{week.map((date, j) => {
            const done = !!date && record.days.includes(date);
            return <td key={date ?? j} className={done ? 'completed-day' : ''} aria-current={date === record.today ? 'date' : undefined}>{date && <><span aria-hidden="true">{Number(date.slice(-2))}<br />{done ? '✓' : '·'}</span><span className="sr-only">{date}: {done ? 'Completed' : date > record.today ? 'Upcoming' : 'No recorded completion'}{date === record.today ? ', today' : ''}</span></>}</td>;
          })}</tr>)}</tbody></table>
        <p className="quiet-note">✓ Completed · Empty days mean no recorded completion. Dates follow the timezone used when each completion was recorded.</p>
      </section>}
      {source === 'cloud' && cloud && <p className="quiet-note">Fetched {new Date(cloud.fetchedAt).toLocaleString()}. Refresh for newer activity. History is not saved offline.</p>}
    </>}
  </section>;
}
