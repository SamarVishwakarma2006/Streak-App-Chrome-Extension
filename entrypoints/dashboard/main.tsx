import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Brand, DaySummary, GoalList, PreviewControl } from '../../src/components/Today';
import type { PreviewState } from '../../src/demo';
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
const upcoming = {
  history: { title: 'Every day adds up.', text: 'Your calendar and past completions will live here once activity tracking is connected.', icon: '▦' },
  rewards: { title: 'Consistency deserves a little credit.', text: 'Daily XP and milestone rewards will appear here when accepted activity is recorded. You have not earned points in this preview.', icon: '◇' },
  connections: { title: 'Your learning, connected.', text: 'No websites are connected yet. Supported learning platforms and their completion rules will be listed here when integrations are ready.', icon: '↗' },
  settings: { title: 'Make it your routine.', text: 'Reminder times, timezone, account, and data controls will be available here as those features are added.', icon: '☷' },
};

function Dashboard() {
  const [section, setSection] = useState<Section>(currentSection);
  const [preview, setPreview] = useState<PreviewState>('sample');
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
        <p>Small steps.<br /><strong>Lasting habits.</strong></p><span className="version">Design preview · v0.1.0</span>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span>Your learning space</span><span className="demo-badge">DEMO PREVIEW</span></header>
      <main id="main-content" className="dashboard" tabIndex={-1}>
        <div className="page-heading">
          <div><p className="eyebrow">BUILD A LITTLE MOMENTUM</p><h1>{sections.find((item) => item.id === section)?.label}</h1>
            <p>{section === 'today' ? 'A good day starts with one small step.' : 'A place for every part of your progress.'}</p></div>
          {section === 'today' && <PreviewControl value={preview} onChange={setPreview} />}
        </div>
        <div className="preview-notice"><span className="notice-dot" aria-hidden="true" /><p>You’re exploring sample data. No websites are connected and no activity is tracked.</p></div>
        {section === 'today' ? <div className="today-layout">
          <div className="today-main">
            {preview === 'sample' && <DaySummary />}
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
        </div> : <section className="section-placeholder">
          <span className="empty-symbol" aria-hidden="true">{upcoming[section].icon}</span>
          <h2>{upcoming[section].title}</h2><p>{upcoming[section].text}</p>
          <a className="button button-outline" href="#today">Back to Today <span aria-hidden="true">→</span></a>
        </section>}
        <footer className="dashboard-footer"><span>Built for progress, one day at a time.</span><span>Design preview · Sample data</span></footer>
      </main>
    </div>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Dashboard /></StrictMode>);
