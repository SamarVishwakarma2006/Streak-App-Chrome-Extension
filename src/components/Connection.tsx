import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { GFG_KEY, GFG_ORIGIN, type ReadingState } from '../reading';
import { useGoals } from '../goals';
export async function readingRequest(action: string, payload?: unknown) {
  const response = await browser.runtime.sendMessage({ type: 'gfg', action, payload });
  if (!response?.ok) throw new Error(response?.error || 'Connection unavailable. Try again.');
  return response as { state: ReadingState; allowed: boolean };
}
export function useReading() {
  const [data, setData] = useState<{ state: ReadingState; allowed: boolean } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true, revision = 0;
    const refresh = async () => { const r = ++revision; try { const value = await readingRequest('read'); if (alive && r === revision) { setData(value); setError(''); } } catch (e) { if (alive) setError((e as Error).message); } };
    const changed = (changes: Record<string, unknown>, area: string) => { if (area === 'local' && GFG_KEY in changes) void refresh(); };
    browser.storage.onChanged.addListener(changed);
    browser.permissions.onRemoved.addListener(refresh); browser.permissions.onAdded.addListener(refresh);
    const timer = setInterval(refresh, 30000); void refresh();
    return () => { alive = false; clearInterval(timer); browser.storage.onChanged.removeListener(changed); browser.permissions.onRemoved.removeListener(refresh); browser.permissions.onAdded.removeListener(refresh); };
  }, []);
  return { data, error };
}
export function Connection() {
  const { store, error: goalsError } = useGoals();
  const { data, error } = useReading();
  const [goalId, setGoalId] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function connect() {
    if (!goalId) { setMessage('Choose a daily goal first.'); return; }
    setBusy(true); setMessage('');
    try {
      if (!await browser.permissions.request({ origins: [GFG_ORIGIN] })) throw new Error('Site access was declined. Your goals remain saved.');
      await readingRequest('connect', { goalId }); setMessage('Connected. Open a supported article and start reading.');
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="week-card connection-card" aria-label="GeeksforGeeks connection">
    <p className="eyebrow">FREE ARTICLES · BROWSER TRACKED · LOCAL BETA</p><h2>Read with GeeksforGeeks.</h2>
    <p>Connect an active goal, then read a free Python or DSA article. Reading requires at least 60 seconds (longer articles take longer) and time spent across 80% of the text. Background, idle time and jumping to the bottom do not qualify.</p>
    <p>Lessons count distinct qualifying articles. Minute goals also require a newly qualifying article that day. Streaks and XP are local prototype records.</p>
    <label className="preview-control">Goal for new articles<select value={goalId} onChange={e => setGoalId(e.target.value)}><option value="">Choose a goal</option>{store?.goals.filter(g => !g.archived).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    <div className="goal-actions"><button className="button" disabled={busy || !goalId} onClick={() => void connect()}>Connect GeeksforGeeks</button>
      {data?.state.goalId && <button className="button button-outline" disabled={busy} onClick={async () => { setBusy(true); try { const result = await readingRequest('disconnect'); setMessage(result.allowed ? 'Disconnected. Chrome retained site access; you can remove it in extension settings.' : 'Disconnected. Saved progress remains on this device.'); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }}>Disconnect</button>}</div>
    <p role="status">{message || (data?.state.goalId && data.allowed ? `Connected to ${store?.goals.find(g => g.id === data.state.goalId)?.name ?? 'saved goal'}.` : 'Not connected.')}</p>
    {(error || goalsError) && <p role="alert">{error || goalsError}</p>}
    <p className="quiet-note">Supported examples: <a href="https://www.geeksforgeeks.org/python/python-variables/" target="_blank" rel="noreferrer">Python Variables</a> · <a href="https://www.geeksforgeeks.org/dsa/binary-search/" target="_blank" rel="noreferrer">Binary Search</a>. Tutorial hubs, quizzes, practice and videos are unsupported.</p>
  </section>;
}
