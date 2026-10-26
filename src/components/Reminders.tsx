import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { useGoals } from '../goals';
import type { Preference, ReminderState } from '../reminders';

const blank = (): Preference => ({ daily: false, time: '18:00', nudge: false, motivation: '', articleTarget: null });
export function Reminders() {
  const { store, error: goalsError } = useGoals();
  const [saved, setSaved] = useState<ReminderState | null>(null), [goalId, setGoalId] = useState('');
  const [pref, setPref] = useState(blank), [quiet, setQuiet] = useState(true);
  const [start, setStart] = useState('22:00'), [end, setEnd] = useState('08:00');
  const [timezone, setTimezone] = useState(''), [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true;
    const refresh = (initial = false) => browser.runtime.sendMessage({ type: 'reminders', action: 'read' }).then(result => {
      if (!alive) return;
      if (!result?.ok) { setError(result?.error ?? 'Reminders are unavailable.'); return; }
      setSaved(result.state); setTimezone(result.timezone); setAllowed(result.allowed);
      if (initial) { setQuiet(result.state.quiet); setStart(result.state.quietStart); setEnd(result.state.quietEnd); }
    }).catch(() => { if (alive) setError('Could not load reminder settings.'); });
    const changed = (changes: Record<string, unknown>, area: string) => { if (area === 'local' && 'reminderSettings' in changes) void refresh(); };
    const permissionsChanged = () => { void refresh(); };
    browser.storage.onChanged.addListener(changed); browser.permissions.onAdded.addListener(permissionsChanged); browser.permissions.onRemoved.addListener(permissionsChanged);
    void refresh(true);
    return () => { alive = false; browser.storage.onChanged.removeListener(changed); browser.permissions.onAdded.removeListener(permissionsChanged); browser.permissions.onRemoved.removeListener(permissionsChanged); };
  }, []);
  async function save() {
    setBusy(true); setError(''); setNotice('');
    try {
      if ((pref.daily || pref.nudge) && !await browser.permissions.request({ permissions: ['notifications'] })) throw new Error('Notification permission was declined. Your reminder settings were not changed.');
      const result = await browser.runtime.sendMessage({ type: 'reminders', action: 'save', payload: { goalId, preference: pref, quiet, quietStart: start, quietEnd: end } });
      if (!result?.ok) throw new Error(result?.error ?? 'Could not save reminders.');
      setSaved(result.state); setAllowed(result.allowed); setNotice('Reminder settings saved.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="week-card connection-card" aria-label="Reminders">
    <p className="eyebrow">A GENTLE RETURN</p><h2>Remember what you’re working toward.</h2>
    <p>Choose a goal for optional reminders. Only the currently connected GeeksforGeeks goal can send them. Open a supported article once to save a Continue location. Progress and settings stay on this device.</p>
    {!store?.goals.some(g => !g.archived) && <p>Create a daily goal in Today to set up reminders.</p>}
    <form className="reminder-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>Goal<select required value={goalId} disabled={busy || !saved} onChange={event => { const id = event.target.value; setGoalId(id); setPref(saved?.goals[id] ?? blank()); setNotice(''); }}>
        <option value="">Choose a goal</option>{store?.goals.filter(g => !g.archived).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select></label>
      <label className="site-approval"><input type="checkbox" checked={pref.daily} onChange={e => setPref({ ...pref, daily: e.target.checked })} />Remind me at a daily time</label>
      <label>Daily reminder time<input type="time" required value={pref.time} onChange={e => setPref({ ...pref, time: e.target.value })} /></label>
      <label className="site-approval"><input type="checkbox" checked={pref.nudge} onChange={e => setPref({ ...pref, nudge: e.target.checked })} />Gently remind me when I leave an unfinished learning session</label>
      <label>What are you working toward? (optional)<input maxLength={100} placeholder="Feel ready for my first coding interview" value={pref.motivation} onChange={e => setPref({ ...pref, motivation: e.target.value })} /></label>
      <label>Article milestone (optional)<input type="number" min={1} max={10000} step={1} placeholder="30" value={pref.articleTarget ?? ''} onChange={e => setPref({ ...pref, articleTarget: e.target.value === '' ? null : Number(e.target.value) })} /></label>
      <p className="quiet-note">Milestones show qualified articles recorded for this goal on this device. They do not measure mastery or progress toward an open-ended aspiration.</p>
      <label className="site-approval"><input type="checkbox" checked={quiet} onChange={e => setQuiet(e.target.checked)} />Use quiet hours for all reminders</label>
      <div className="goal-actions"><label>Quiet hours start<input type="time" required value={start} onChange={e => setStart(e.target.value)} /></label><label>Quiet hours end<input type="time" required value={end} onChange={e => setEnd(e.target.value)} /></label></div>
      <p className="quiet-note">Times use your learning timezone: {timezone || 'loading…'}. One automatic reminder per goal per day; a requested snooze can follow up after 10 minutes. Returning to reading cancels a pending snooze.</p>
      <button className="button" disabled={busy || !saved || !goalId}>{busy ? 'Saving…' : 'Save reminders'}</button>
    </form>
    <p>A nudge needs 30 seconds of active reading and at least a minute away. Quick tab switches do not trigger it. Destination websites are not inspected or saved.</p>
    <p className="quiet-note">Use Continue or Snooze in the notification; close it to dismiss. Chrome or device sleep can delay delivery. Reminders over an hour late are skipped, and OS notification settings can silence them.</p>
    {!allowed && <p className="quiet-note">Notifications are currently unavailable or not allowed. Chrome asks for permission when you save enabled reminders.</p>}
    {notice && <p role="status">{notice}</p>}{(error || goalsError || saved?.error) && <p role="alert">{error || goalsError || saved?.error}</p>}
  </section>;
}
