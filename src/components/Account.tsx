import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
type AccountState = { configured: boolean; user: { id: string; email: string } | null; goals?: { id: string; name: string }[]; message?: string };
export function Account() {
  const [state, setState] = useState<AccountState | null>(null);
  const [email, setEmail] = useState(''), [code, setCode] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const revision = useRef(0);
  async function run(action: string) {
    const request = ++revision.current;
    const submittedCode = code;
    if (action === 'verify' || action === 'signout') setCode('');
    setBusy(true); setError('');
    try {
      const result = await browser.runtime.sendMessage({ type: 'account', action, payload: { email, code: submittedCode } });
      if (result?.ok && action !== 'read') setNotice(result.message ?? '');
      if (request !== revision.current) return;
      if (!result?.ok) throw new Error(result?.error || 'Account unavailable. Retry when online.');
      setState(result);
      if (action === 'verify' || action === 'signout') setCode('');
    } catch (e) { if (request === revision.current) setError((e as Error).message); } finally { if (request === revision.current) setBusy(false); }
  }
  useEffect(() => {
    const changed = (changes: Record<string, unknown>, area: string) => { if (area === 'local' && Object.keys(changes).some(k => k.startsWith('auth:'))) void run('read'); };
    browser.storage.onChanged.addListener(changed); void run('read');
    return () => { revision.current++; browser.storage.onChanged.removeListener(changed); };
  }, []);
  return <section className="week-card connection-card" aria-label="Account">
    <p className="eyebrow">YOUR ACCOUNT</p><h2>A home for your goals.</h2>
    {!state && !error && <p role="status">Checking account…</p>}
    {state?.configured === false ? <><p>Cloud setup is needed before you can sign in. Your device-only goals and reading progress still work.</p><p className="quiet-note">For development: configure the Supabase project and publishable key, apply both database migrations, then rebuild the extension. See supabase/README.md.</p></> : <>
      {state?.user ? <><p>Signed in as <strong>{state.user.email}</strong>.</p>
        <p>Copy your active device-only goal names and daily targets into this account. Existing copies are kept unchanged. Links, reading history and prototype XP are never included. Cloud activity synchronization is coming in a later step.</p>
        <button className="button" disabled={busy} onClick={() => void run('copy')}>Copy goal definitions to my account</button>
        {!!state.goals?.length && <ul aria-label="Account goals">{state.goals.map(g => <li key={g.id}>{g.name}</li>)}</ul>}
      </> : <form onSubmit={e => { e.preventDefault(); void run('verify'); }}>
        <label className="preview-control">Email address<input type="email" autoComplete="email" required value={email} onChange={e => { setEmail(e.target.value); setCode(''); }} /></label>
        <button type="button" className="button button-outline" disabled={busy || !email} onClick={() => void run('send')}>Send sign-in code</button>
        <label className="preview-control">Email code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required value={code} onChange={e => setCode(e.target.value)} /></label>
        <button className="button" disabled={busy || !code}>Verify code</button>
      </form>}
      <div className="goal-actions"><button className="button button-outline" disabled={busy} onClick={() => void run('read')}>Refresh account</button><button className="button button-outline" disabled={busy} onClick={() => void run('signout')}>Sign out on this device</button></div>
    </>}
    {(notice || state?.message) && <p role="status">{notice || state?.message}</p>}{error && <p role="alert">{error}</p>}
    <p className="quiet-note">Today shows device-only goals, shared by this browser profile. Signing out removes account credentials and cached account goals; device-only progress remains.</p>
  </section>;
}
