import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/base.css';

function Dashboard() {
  return (
    <main className="dashboard">
      <header className="brand">
        <img src="/icon/48.png" width="36" height="36" alt="" />
        <span>Streak Maintaining App</span>
      </header>
      <section className="welcome" aria-labelledby="welcome-title">
        <p className="eyebrow">Development preview · Step 02</p>
        <h1 id="welcome-title">Small steps.<br />Lasting habits.</h1>
        <p>This is the starting point for your learning dashboard.</p>
        <div className="status">
          <span className="status-dot" aria-hidden="true" />
          Extension scaffold ready
        </div>
      </section>
      <section className="next-step" aria-labelledby="next-title">
        <p className="eyebrow">Up next</p>
        <h2 id="next-title">A home for your daily goals</h2>
        <p>Step 03 adds the Today interface and shared design styles. Goal creation,
          progress tracking, and cloud accounts follow in separate updates.</p>
      </section>
      <footer>No learning websites are connected. This preview collects no activity.</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><Dashboard /></StrictMode>,
);
