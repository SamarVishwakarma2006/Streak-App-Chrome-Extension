import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import '../../src/styles/base.css';

function Popup() {
  return (
    <main className="popup">
      <header className="brand">
        <img src="/icon/48.png" width="32" height="32" alt="" />
        <span>Streak Maintaining App</span>
      </header>
      <p className="eyebrow">Development preview · Step 02</p>
      <h1>Make room for a little progress.</h1>
      <p>The extension is installed. Your daily learning goals will live here.</p>
      <a
        className="button"
        href={browser.runtime.getURL('/dashboard.html')}
        target="_blank"
        rel="noreferrer"
      >
        Open dashboard <span aria-hidden="true">↗</span>
      </a>
      <p className="note">Goal creation, tracking, and rewards are coming in later steps.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><Popup /></StrictMode>,
);
