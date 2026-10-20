import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { Brand, DaySummary, GoalList } from '../../src/components/Today';
import '../../src/styles/base.css';

function Popup() {
  return <main className="popup">
    <header className="popup-header"><Brand /><span className="demo-badge">DEMO</span></header>
    <div className="popup-title"><h1>Today</h1><span>Make a little progress.</span></div>
    <DaySummary compact />
    <GoalList state="sample" compact />
    <a className="dashboard-link" href={browser.runtime.getURL('/dashboard.html')} target="_blank" rel="noreferrer">
      Open dashboard <span aria-hidden="true">↗</span>
    </a>
    <p className="popup-disclaimer">Sample goals only. No activity is being tracked.</p>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Popup /></StrictMode>);
