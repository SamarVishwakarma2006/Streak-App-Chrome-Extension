import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { Brand } from '../../src/components/Today';
import { SavedGoals } from '../../src/components/SavedGoals';
import { CloudProgress } from '../../src/components/CloudProgress';
import '../../src/styles/base.css';

function Popup() {
  return <main className="popup">
    <header className="popup-header"><Brand /><span className="demo-badge">BETA</span></header>
    <div className="popup-title"><h1>Today</h1><span>Make a little progress.</span></div>
    <div className="popup-goals"><CloudProgress compact /><SavedGoals compact /></div>
    <a className="dashboard-link" href={browser.runtime.getURL('/dashboard.html')} target="_blank" rel="noreferrer">
      Open dashboard <span aria-hidden="true">↗</span>
    </a>
    <p className="popup-disclaimer">Device goals show local progress. Enable optional cloud sync in dashboard Settings.</p>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Popup /></StrictMode>);
