import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { Brand } from '../../src/components/Brand';
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
  useEffect(() => {
    const update = () => {
      setSection(currentSection());
      document.getElementById('main-content')?.focus();
      window.scrollTo(0, 0);
    };
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
        <p>Small steps.<br /><strong>Lasting habits.</strong></p><span className="version">Beta · v{browser.runtime.getManifest().version}</span>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span>Your learning space</span><span className="demo-badge">BETA</span></header>
      <main id="main-content" className="dashboard" tabIndex={-1}>
        <div className="page-heading">
          <div><p className="eyebrow">BUILD A LITTLE MOMENTUM</p><h1>{sections.find((item) => item.id === section)?.label}</h1>
            <p>{section === 'today' ? 'A good day starts with one small step.' : 'A place for every part of your progress.'}</p></div>
        </div>
        {section === 'today' ? <><CloudProgress /><SavedGoals /></> : section === 'connections' ? <Connection /> : section === 'settings' ? <><Reminders /><Account /><CloudProgress controls /><Privacy /></> : <ProgressPage key={section} rewards={section === 'rewards'} />}
        <footer className="dashboard-footer"><span>Built for progress, one day at a time.</span><span>Local resume history · Optional account sync</span></footer>
      </main>
    </div>
  </div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Dashboard /></StrictMode>);
