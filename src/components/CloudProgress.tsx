import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { CloudState } from '../cloud';

export function CloudProgress({ controls = false, compact = false }: { controls?: boolean; compact?: boolean }) {
  const [state, setState] = useState<CloudState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action: string) {
    setBusy(true); setError('');
    try {
      const result = await browser.runtime.sendMessage({ type: 'cloud', action });
      if (!result?.ok) throw new Error(result?.error ?? 'Cloud sync is unavailable.');
      setState(result.state);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const result = await browser.runtime.sendMessage({ type: 'cloud', action: 'read' });
        if (!result?.ok) throw new Error(result?.error ?? 'Cloud progress could not be loaded.');
        if (alive) { setState(result.state); setError(''); }
      } catch (e) { if (alive) setError((e as Error).message); }
    };
    const changed = (changes: Record<string, unknown>, area: string) => { if (area === 'local' && Object.keys(changes).some(k => k.startsWith('cloud:'))) void refresh(); };
    browser.storage.onChanged.addListener(changed); void refresh();
    return () => { alive = false; browser.storage.onChanged.removeListener(changed); };
  }, []);
  if (!state && !controls && !error) return null;
  const pending = state?.events.filter(e => e.status === 'pending').length ?? 0;
  return <section className={`week-card connection-card cloud-progress${compact ? ' is-compact' : ''}`} aria-label="Cloud progress">
    <p className="eyebrow">CLOUD RECORDS · BROWSER TRACKED</p><h2>Accepted learning.</h2>
    {state ? <>
      <p role="status">{state.enabled ? 'Cloud sync enabled' : 'Cloud sync paused'} · {pending} pending submission{pending === 1 ? '' : 's'}.</p>
      <p className="quiet-note">Last fetched: {state.refreshedAt ? new Date(state.refreshedAt).toLocaleString() : 'Not yet'}. These are cached server totals.</p>
      <ul aria-label="Server goal totals">{state.goals.map(goal => <li key={goal.id}>
        <strong>{goal.name}</strong> — {goal.summary.current} day streak · best {goal.summary.best} · {goal.summary.xp} XP.
        {!compact && <p>{goal.summary.local_date}: {goal.summary.completed_today ? 'Goal completed' : 'Goal unfinished'} · target {goal.summary.target} {goal.summary.unit}.</p>}
      </li>)}</ul>
      {state.error && <p role="alert">{state.error}</p>}
      {!compact && !!state.events.length && <ul aria-label="Recent cloud submissions">{state.events.slice(-5).map(e => <li key={e.id}><strong>{e.status.replace('_', ' ')}</strong>: {e.detail ?? 'Waiting for server confirmation.'}</li>)}</ul>}
      <button className="button button-outline" disabled={busy} onClick={() => void run('retry')}>Sync and refresh</button>
    </> : <p>Sign in, copy your goal definitions, and connect GeeksforGeeks to enable cloud tracking.</p>}
    {controls && <>
      <p>Enable sync to submit newly started articles. Existing reading history, resume links and local prototype XP stay on this device. The article path and bounded reading evidence are sent to your account.</p>
      <p>Cloud credit uses the day the server receives the article, even after an offline day. Minute goals count only qualified articles. Local edits do not change copied cloud targets.</p>
      <button className="button" disabled={busy} onClick={() => void run(state?.enabled ? 'pause' : 'enable')}>{state?.enabled ? 'Pause cloud sync' : 'Enable cloud sync'}</button>
      <p className="quiet-note">Pause retains queued submissions. Signing out discards unsynced submissions on this device. Pending submissions expire after seven days.</p>
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
