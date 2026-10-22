import { browser } from 'wxt/browser';
import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { articleURL } from '../src/reading';
type Chunk = { ranges: Range[]; words: number };
export default defineUnlistedScript(() => {
  const global = globalThis as typeof globalThis & { __streakReader?: boolean };
  if (global.__streakReader) return;
  global.__streakReader = true;
  document.getElementById('streak-reading-panel')?.remove();
  const host = document.createElement('div');
  host.id = 'streak-reading-panel';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<style>:host{all:initial;position:fixed;bottom:16px;right:16px;z-index:2147483647;font:13px/1.6 system-ui;color:#203e35}section{width:280px;max-width:calc(100vw - 48px);padding:16px;border:1px solid #ccd9ca;border-radius:14px;background:#f9fcf6;box-shadow:0 8px 32px #18332630}strong{display:block}p{margin:6px 0}small{display:block;color:#52614c}progress{width:100%;accent-color:#205841}button{margin-top:8px;padding:6px 12px;border:1px solid #205841;border-radius:6px;background:white;color:#205841;cursor:pointer}button:focus-visible{outline:3px solid #a44517}</style><section aria-label="Streak reading progress"><strong>Streak · Browser tracked</strong><p id="status" role="status">Checking article…</p><progress max="100" value="0" aria-label="Article coverage"></progress><small id="details">Read actively for the required time and cover 80% of the article. Background and idle time pause.</small><button type="button">Hide for this page</button></section>';
  document.documentElement.append(host);
  shadow.querySelector('button')!.addEventListener('click', () => { host.style.display = 'none'; });
  const status = shadow.querySelector<HTMLElement>('#status')!;
  const details = shadow.querySelector<HTMLElement>('#details')!;
  const bar = shadow.querySelector('progress')!;
  let chunks: Chunk[] = [], fingerprint = '', url = '', title = '', body: Element | null = null;
  let dirty = true, busy = false, lastInteraction = -Infinity, lastIdentity = '', lastSample = performance.now();
  let observer: MutationObserver | undefined;
  const interacted = (event: Event) => { if (event.isTrusted && !(event.target instanceof Element && host.contains(event.target))) lastInteraction = performance.now(); };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) document.addEventListener(type, interacted, { passive: true, capture: true });
  async function identify() {
    url = articleURL(location.href);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical || articleURL(canonical.href) !== url) throw new Error('Unsupported: missing or mismatched article identity.');
    const candidates = document.querySelectorAll('.article--viewer_content .text');
    const headings = document.querySelectorAll('h1');
    if (candidates.length !== 1 || headings.length !== 1) throw new Error('Unsupported: article layout could not be identified.');
    body = candidates[0]!; title = headings[0]!.textContent!.trim().slice(0, 120);
    if (!title || /tutorial|interview questions|quiz|practice|examples|complete guide/i.test(title)) throw new Error('Unsupported: open an individual free article, rather than a directory.');
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    chunks = []; let chunk: Chunk = { ranges: [], words: 0 }; let normalized = '';
    while (walker.nextNode()) {
      const text = walker.currentNode as Text, parent = text.parentElement;
      if (!parent || parent.closest('script,style,button,input,textarea,select,nav,aside,iframe,form,[contenteditable],.recommended-articles,.article-bottom-buttons') || !parent.getClientRects().length || getComputedStyle(parent).visibility !== 'visible') continue;
      const words = [...text.data.matchAll(/\S+/g)];
      normalized += words.map(w => w[0]).join(' ') + ' ';
      let start = 0;
      while (start < words.length) {
        const count = Math.min(40 - chunk.words, words.length - start);
        const range = document.createRange();
        range.setStart(text, words[start]!.index!);
        const end = words[start + count - 1]!;
        range.setEnd(text, end.index! + end[0].length);
        chunk.ranges.push(range); chunk.words += count; start += count;
        if (chunk.words === 40) { chunks.push(chunk); chunk = { ranges: [], words: 0 }; }
      }
    }
    if (chunk.words) chunks.push(chunk);
    const words = chunks.reduce((sum, c) => sum + c.words, 0);
    if (words < 100 || chunks.length > 500) throw new Error('Unsupported: article length is outside the supported range.');
    fingerprint = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized.trim())))].map(n => n.toString(16).padStart(2, '0')).join('');
    observer?.disconnect(); observer = new MutationObserver(() => { dirty = true; });
    observer.observe(body, { childList: true, characterData: true, subtree: true });
    lastIdentity = location.href; dirty = false;
  }
  function visibleChunk(chunk: Chunk) {
    let total = 0, exposed = 0;
    for (const range of chunk.ranges) for (const r of range.getClientRects()) {
      total += r.width * r.height;
      const left = Math.max(0, r.left), right = Math.min(innerWidth, r.right), top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom);
      if (right > left && bottom > top) {
        const element = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
        if (element && body?.contains(element)) exposed += (right - left) * (bottom - top);
      }
    }
    return total > 0 && exposed >= total * .5;
  }
  function resume(index: number) {
    const range = chunks[index]?.ranges[0];
    if (!range) return;
    window.scrollBy({ top: range.getBoundingClientRect().top - 100, behavior: 'instant' });
    lastInteraction = -Infinity; // Continue restores position independently from reading credit.
  }
  const resumeMessage = (message: any) => { if (message?.type === 'gfg-resume' && Number.isInteger(message.chunk)) resume(message.chunk); };
  browser.runtime.onMessage.addListener(resumeMessage);
  let timer: ReturnType<typeof setInterval>;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      if (dirty || lastIdentity !== location.href || !body?.isConnected) await identify();
      const now = performance.now(), gap = now - lastSample; lastSample = now;
      const visible = chunks.flatMap((chunk, i) => visibleChunk(chunk) ? [i] : []);
      const eligible = document.visibilityState === 'visible' && document.hasFocus() && now - lastInteraction <= 90000 && gap <= 2000 && visible.length > 0;
      const answer = await browser.runtime.sendMessage({ type: 'gfg', action: 'sample', payload: { url, title, fingerprint, weights: chunks.map(c => c.words), visible, eligible, chunk: visible[0] ?? 0 } });
      if (!answer?.ok) throw new Error(answer?.error || 'Tracking unavailable. Reload this page.');
      if (status.textContent !== answer.status) status.textContent = answer.status;
      if (answer.stopped) {
        clearInterval(timer); observer?.disconnect(); global.__streakReader = false;
        browser.runtime.onMessage.removeListener(resumeMessage);
        for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) document.removeEventListener(type, interacted, true);
        return;
      }
      if (answer.required) {
        bar.value = answer.coverage;
        details.textContent = `${answer.seconds} / ${answer.required} active seconds · ${answer.coverage}% / 80% coverage. Keep reading; no proof of learning is claimed.`;
      }
      if (Number.isInteger(answer.resume) && answer.fingerprint === fingerprint) resume(answer.resume);
    } catch (e) { status.textContent = e instanceof Error ? e.message : 'Tracking unavailable. Reload the page.'; }
    finally { busy = false; }
  };
  timer = setInterval(() => void tick(), 1000); void tick();
});
