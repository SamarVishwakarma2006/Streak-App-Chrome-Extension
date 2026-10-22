import { useEffect, useRef, useState } from 'react';
import { cleanLocation, goalRequest, useGoals, type Goal } from '../goals';
import { useReading } from './Connection';
import { progress } from '../streaks';
export function SavedGoals({ compact = false }: { compact?: boolean }) {
  const { store, error } = useGoals();
  const { data: reading } = useReading();
  const [archived, setArchived] = useState(false);
  const [editor, setEditor] = useState<Goal | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (editor || deleting) dialog.current?.showModal(); }, [editor, deleting]);
  async function mutate(action: string, payload: unknown, success: string) {
    setBusy(true); setFailure('');
    try { await goalRequest(action, payload); setMessage(success); dialog.current?.close(); }
    catch (e) { setFailure((e as Error).message); }
    finally { setBusy(false); }
  }
  if (error) return <div role="alert" className="dialog-note">{error} Reload this page to retry.</div>;
  if (!store) return <p role="status">Loading saved goals…</p>;
  const visible = store.goals.filter(g => g.archived === archived);
  return <>
    {!compact && <div className="section-heading goal-toolbar"><div><h2>Your daily goals</h2><p>{visible.length} {archived ? 'archived' : 'active'} goals</p></div>
      <div className="goal-actions"><button className="button button-outline" onClick={() => setArchived(!archived)}>{archived ? 'Show active' : 'Show archived'}</button>
      <button className="button" disabled={busy} onClick={() => { setFailure(''); setEditor('new'); }}>New goal</button></div></div>}
    <p role="status" className="quiet-note">{message}</p>
    {failure && !editor && !deleting && <p role="alert">{failure}</p>}
    {visible.length === 0 ? <section className="empty-state"><h3>{archived ? 'No archived goals.' : 'Your next chapter starts here.'}</h3><p>{archived ? 'Archived goals stay saved until you delete them.' : 'Create a daily goal in the dashboard to start building your routine.'}</p></section> :
      <div className={`goal-list saved-goals ${compact ? 'compact' : ''}`}>{visible.map(goal => <article className="goal-card" key={goal.id}>
        <div className="goal-symbol green" aria-hidden="true">↗</div><div className="goal-content"><div className="goal-title-row"><h3>{goal.name}</h3></div>
          <p className="lesson">{goal.target} {goal.unit} per day</p><p className="evidence">{goal.archived ? 'Archived' : reading?.allowed && reading.state.goalId === goal.id ? 'GeeksforGeeks · Browser tracked' : 'Not connected'} · Saved on this device</p>
          {reading?.state.ledger.goals[goal.id] && <p className="lesson">{progress(reading.state.ledger, goal.id, Math.max(Date.now(), reading.state.ledger.clock)).current} day streak · {progress(reading.state.ledger, goal.id, Math.max(Date.now(), reading.state.ledger.clock)).xp} local XP</p>}
          {goal.location && <p className="lesson" title={goal.location.url}>{goal.location.title || goal.location.origin} · Bookmark</p>}</div>
        <div className="goal-actions goal-action">
          {!goal.archived && <button className="button" disabled={busy || !goal.location} aria-label={`Continue ${goal.name}`} onClick={() => void mutate('continue', { id: goal.id }, 'Lesson opened. If it moved or asks you to sign in, update the link or sign in on that website.')}>Continue →</button>}
          {!compact && <>
          <button className="button button-outline" disabled={busy} aria-label={`Edit ${goal.name}`} onClick={() => { setFailure(''); setEditor(goal); }}>Edit</button>
          <button className="button button-quiet" disabled={busy} aria-label={`${archived ? 'Restore' : 'Archive'} ${goal.name}`} onClick={() => void mutate(archived ? 'restore' : 'archive', { id: goal.id }, archived ? 'Goal restored.' : 'Goal archived.')}>{archived ? 'Restore' : 'Archive'}</button>
          <button className="button button-outline" disabled={busy} aria-label={`Delete ${goal.name}`} onClick={() => { setFailure(''); setDeleting(goal); }}>Delete</button></>}
          {compact && !goal.location && <span className="evidence">Add a link in the dashboard</span>}
        </div>
      </article>)}</div>}
    <dialog ref={dialog} className="goal-dialog" aria-labelledby="goal-editor-title" onCancel={e => { if (busy) e.preventDefault(); }} onClose={() => { setEditor(null); setDeleting(null); setFailure(''); }}>
      <h2 id="goal-editor-title">{deleting ? 'Delete goal?' : editor === 'new' ? 'New daily goal' : 'Edit daily goal'}</h2>
      {deleting ? <><p>Delete “{deleting.name}” from this device? This cannot be undone. Archive it instead to keep it for later.</p>
        <button className="button" disabled={busy} onClick={() => void mutate('delete', { id: deleting.id }, 'Goal deleted.')}>Delete permanently</button></> : editor &&
        <form key={typeof editor === 'string' ? editor : editor.id} onSubmit={event => {
          event.preventDefault(); const data = new FormData(event.currentTarget);
          try {
            const url = String(data.get('url')).trim();
            if (url && !data.get('approved')) throw new Error('Approve this site before saving its lesson link.');
            const location = url ? cleanLocation({ url, origin: new URL(url).origin, title: String(data.get('title')) }) : null;
            void mutate(editor === 'new' ? 'create' : 'edit', { id: editor === 'new' ? undefined : editor.id, name: data.get('name'), target: Number(data.get('target')), unit: data.get('unit'), location }, 'Goal saved.');
          } catch (e) { setFailure((e as Error).message); }
        }}>
          <label>Goal name<input name="name" required maxLength={80} pattern=".*\S.*" autoFocus defaultValue={editor === 'new' ? '' : editor.name} placeholder="Learn JavaScript" /></label>
          <label>Daily target<input name="target" type="number" required min={1} max={1440} step={1} defaultValue={editor === 'new' ? 20 : editor.target} /></label>
          <label>Unit<select name="unit" defaultValue={editor === 'new' ? 'minutes' : editor.unit}><option value="minutes">Minutes</option><option value="lessons">Lessons</option></select></label>
          <label>Lesson URL (optional)<input name="url" type="url" maxLength={2048} defaultValue={editor === 'new' ? '' : editor.location?.url ?? ''} placeholder="https://learning.example.com/lesson" /></label>
          <label>Lesson title (optional)<input name="title" maxLength={120} defaultValue={editor === 'new' ? '' : editor.location?.title ?? ''} /></label>
          <label className="site-approval"><input name="approved" type="checkbox" />I approve opening the site in this lesson URL.</label>
          <p className="evidence">Use a public lesson link without private information. Query parameters and fragments are removed; links that need them are not supported yet. Leave the URL empty to remove a bookmark.</p>
          <div className="dialog-note">Use Connections to track GeeksforGeeks articles. Changes to a connected daily target take effect at its next midnight.</div>
          <button className="button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save goal'}</button>
        </form>}
      {failure && <p role="alert">{failure}</p>}
      <button className="button button-outline" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button>
    </dialog>
  </>;
}
