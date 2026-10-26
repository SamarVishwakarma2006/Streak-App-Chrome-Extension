import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Brand, DaySummary, GoalList, PreviewControl, StreakPreview } from '../../src/components/Today';
import type { PreviewState } from '../../src/components/Today';
import { ProgressPage } from '../../src/components/ProgressPage';
import { SavedGoals } from '../../src/components/SavedGoals';
import { Account } from '../../src/components/Account';
import { CloudProgress } from '../../src/components/CloudProgress';
import { Reminders } from '../../src/components/Reminders';
import { Privacy } from '../../src/components/Privacy';
import { Connection } from '../../src/components/Connection';
import '../../src/styles/base.css';

const sections = [
  { id: 'today', label: 'Today', symbol: '◷' },
  { id: 'history', label: 'History', symbol: '▦' },
  { id: 'rewards', label: 'Rewards', symbol: '◇' },
  { id: 'connections', label: 'Connections', symbol: '↗' },
  { id: 'settings', label: 'Settings', symbol: '☷' },
] as const;
type Section = (typeof sections)[number]['id'];
function currentSection(): Section {
  return sections.find((section) => section.id === location.hash.slice(1))?.id ?? 'today';
}

function Dashboard() {
  const [section, setSection] = useState<Section>(currentSection);
  const [preview, setPreview] = useState<PreviewState>('sample');
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    const update = () => setSection(currentSection());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return <div className="app-layout">
    <a className="skip-link" href="#main-content" onClick={(event) => {
      event.preventDefault();
      document.getElementById('main-content')?.focus();
    }}>Skip to content</a>
    <aside className="sidebar">
      <Brand /><p className="sidebar-caption">YOUR DAILY PRACTICE</p>
      <nav aria-label="Main navigation">{sections.map((item) =>
        <a key={item.id} href={`#${item.id}`} aria-current={section === item.id ? 'page' : undefined}>
          <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>{item.label}
          {section === item.id && <span className="nav-dot" aria-hidden="true" />}
        </a>)}</nav>
      <div className="sidebar-bottom"><span className="seed" aria-hidden="true">↗</span>
        <p>Small steps.<br /><strong>Lasting habits.</strong></p><span className="version">Development · v0.1.0</span>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span>Your learning space</span><span className="demo-badge">DEVELOPMENT</span></header>
      <main id="main-content" className="dashboard" tabIndex={-1}>
        <div className="page-heading">
          <div><p className="eyebrow">BUILD A LITTLE MOMENTUM</p><h1>{sections.find((item) => item.id === section)?.label}</h1>
            <p>{section === 'today' ? 'A good day starts with one small step.' : 'A place for every part of your progress.'}</p></div>
          {section === 'today' && <button className="button button-outline" onClick={() => setDemo(!demo)}>{demo ? 'Back to saved goals' : 'Explore design demo'}</button>}
        </div>
        <div className="preview-notice"><span className="notice-dot" aria-hidden="true" /><p>{demo && section === 'today' ? 'You’re exploring sample data. No activity is tracked.' : 'Device goals show local prototype progress. Cloud records are shown separately after you enable sync in Settings.'}</p></div>
        {section === 'today' ? !demo ? <><CloudProgress /><SavedGoals /></> : <div className="today-layout">
          <div className="today-main"><PreviewControl value={preview} onChange={setPreview} />
            {preview === 'sample' && <><DaySummary /><StreakPreview /></>}
            <div className="section-heading"><h2>Your daily goals</h2><span>{preview === 'sample' ? '3 sample goals' : 'Preview'}</span></div>
            <GoalList state={preview} />
            <p className="quiet-note">Your progress will be recorded automatically on supported websites.</p>
          </div>
          <aside className="insights" aria-label="Example progress insights">
            <section className="week-card">
              <p className="eyebrow">THE BIG PICTURE · EXAMPLE</p><h2>A week of showing up.</h2>
              <div className="week-dots" role="img" aria-label="Example week: Monday through Thursday completed, Friday in progress, weekend upcoming">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <div key={i}><span>{day}</span><b className={i < 4 ? 'day-done' : i === 4 ? 'day-now' : ''}>{i < 4 ? '✓' : i === 4 ? '·' : ''}</b></div>)}
              </div><p>Every little effort counts.</p>
            </section>
            <section className="milestone-card"><span className="milestone-symbol" aria-hidden="true">◇</span>
              <p className="eyebrow">NEXT MILESTONE · EXAMPLE</p><h2>14 days of JavaScript</h2><p>Two more days to your next milestone.</p>
              <div className="milestone-bottom"><strong>+100 XP</strong><span>12 / 14 days</span></div>
            </section>
            <section className="gentle-note"><h3>A fresh start is still progress.</h3><p>Miss a day? Your streak restarts, but everything you’ve learned stays with you.</p></section>
          </aside>
        </div> : section === 'connections' ? <Connection /> : section === 'settings' ? <><Reminders /><Account /><CloudProgress controls /><Privacy /></> : <ProgressPage key={section} rewards={section === 'rewards'} />}
        <footer className="dashboard-footer"><span>Built for progress, one day at a time.</span><span>Local resume history · Optional account sync</span></footer>
      </main>
    </div>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Dashboard /></StrictMode>);
