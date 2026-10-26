import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';

export function Privacy() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [confirming, setConfirming] = useState<'clear-device' | 'delete-account' | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (confirming) dialog.current?.showModal(); }, [confirming]);
  async function run(action: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await browser.runtime.sendMessage({ type: 'privacy', action, payload: { confirmation } });
      if (!result?.ok) throw new Error(result?.error ?? 'Data operation failed. Please retry.');
      if (result.document) {
        const url = URL.createObjectURL(new Blob([JSON.stringify(result.document, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url;
        link.download = `streak-${action === 'export-device' ? 'device' : 'account'}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        setNotice('Export prepared. Check your downloads. Keep it private: it contains your goals and activity. Exports cannot be imported yet.');
      } else setNotice(result.message ?? 'Done.');
      dialog.current?.close();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const token = confirming === 'delete-account' ? 'DELETE' : 'CLEAR';
  return <section className="week-card connection-card privacy-controls" aria-label="Privacy and data">
    <p className="eyebrow">YOUR DATA</p><h2>Keep what matters. Clear what you choose.</h2>
    <p>Device exports include goal definitions, bookmarks, reading progress, local XP and reminder preferences. Account exports include your profile and cloud activity. Credentials and pending submission payloads are excluded.</p>
    <div className="goal-actions"><button className="button button-outline" disabled={busy} onClick={() => void run('export-device')}>Export device data</button><button className="button button-outline" disabled={busy} onClick={() => void run('export-account')}>Export account data</button></div>
    <p>Disconnect device tracking in <a href="#connections">Connections</a>. To stop accepted GeeksforGeeks submissions from all devices, disable the account connection below. It can be enabled again in Cloud sync.</p>
    <button className="button button-outline" disabled={busy} onClick={() => void run('disconnect-account')}>Disable account connection</button>
    <p>Clearing device activity removes local streaks, XP, article checkpoints, bookmarks, reminders and unsynced submissions. It disconnects tracking and keeps goal definitions and cloud records.</p>
    <button className="button button-outline" disabled={busy} onClick={() => { setError(''); setConfirming('clear-device'); }}>Clear device activity</button>
    <p>Deleting your account permanently removes its identity and active cloud records. It also clears all goals, activity and credentials on this browser. Other browsers may retain device-only records; downloaded exports must be removed separately.</p>
    <button className="button button-outline danger-button" disabled={busy} onClick={() => { setError(''); setConfirming('delete-account'); }}>Delete account</button>
    <p className="quiet-note">Accepted records remain while the account exists. Cloud reading evidence is eligible for removal after 30 days; deployment must enable the daily cleanup job. This development project has no hosted backups. Production backup and provider log retention must be published before launch. Uninstalling the extension does not delete a cloud account.</p>
    {busy && <p role="status">Working… Keep this page open.</p>}
    {notice && <p role="status">{notice}</p>}{error && !confirming && <p role="alert">{error}</p>}
    <dialog ref={dialog} className="goal-dialog" aria-labelledby="privacy-confirm-title" onCancel={e => { if (busy) e.preventDefault(); }} onClose={() => { setConfirming(null); setConfirmation(''); }}>
      <h2 id="privacy-confirm-title">{confirming === 'delete-account' ? 'Permanently delete your account?' : 'Clear device activity?'}</h2>
      <p>{confirming === 'delete-account' ? 'This removes your account and cloud progress. It cannot be undone. All goals, activity, bookmarks, reminders and unsynced submissions on this browser will also be erased.' : 'This erases local activity, XP, bookmarks, reminders and unsynced submissions. Cloud records and local goal definitions remain.'} Export first if you want a copy.</p>
      <form onSubmit={e => { e.preventDefault(); if (confirming) void run(confirming); }}>
        <label>Type {token} to confirm<input autoFocus autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
        <button className="button danger-button" disabled={busy || confirmation !== token}>{busy ? 'Working…' : confirming === 'delete-account' ? 'Delete permanently' : 'Clear permanently'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <button className="button button-outline" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button>
    </dialog>
  </section>;
}
