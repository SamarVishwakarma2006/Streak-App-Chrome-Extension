import { browser } from 'wxt/browser';
import { useEffect, useState } from 'react';
export type Goal = { id: string; name: string; target: number; unit: 'minutes' | 'lessons'; archived: boolean };
export type GoalStore = { version: 1; goals: Goal[] };
export const STORE_KEY = 'goalStore';
export function validateGoal(value: unknown): Goal {
  const g = value as Goal;
  if (!g || typeof g.id !== 'string' || !g.id || typeof g.name !== 'string' || !g.name.trim() || g.name.length > 80 || !Number.isInteger(g.target) || g.target < 1 || g.target > 1440 || !['minutes', 'lessons'].includes(g.unit) || typeof g.archived !== 'boolean') throw new Error('Enter a goal name (1–80 characters) and a whole-number target from 1 to 1440.');
  return { id: g.id, name: g.name.trim(), target: g.target, unit: g.unit, archived: g.archived };
}
// Step 03 had no persisted data. Add explicit migrations here for future schemas.
export function migrateGoals(value: unknown): GoalStore {
  if (value === undefined) return { version: 1, goals: [] };
  const s = value as GoalStore;
  if (!s || s.version !== 1 || !Array.isArray(s.goals)) throw new Error('Saved goals use an unsupported or damaged format. Your data has been preserved.');
  const goals = s.goals.map(validateGoal);
  if (new Set(goals.map(g => g.id)).size !== goals.length) throw new Error('Duplicate goal IDs. Your data has been preserved.');
  return { version: 1, goals };
}
export async function goalRequest(action: string, payload?: unknown): Promise<GoalStore> {
  const result = await browser.runtime.sendMessage({ type: 'goals', action, payload });
  if (!result?.ok) throw new Error(result?.error || 'Could not access saved goals. Please try again.');
  return result.store;
}
export function useGoals() {
  const [store, setStore] = useState<GoalStore | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true, revision = 0;
    const refresh = async () => {
      const request = ++revision;
      try { const value = await goalRequest('read'); if (alive && request === revision) { setStore(value); setError(''); } }
      catch (e) { if (alive && request === revision) setError((e as Error).message); }
    };
    const changed = (changes: Record<string, unknown>, area: string) => { if (area === 'local' && STORE_KEY in changes) void refresh(); };
    browser.storage.onChanged.addListener(changed); void refresh();
    return () => { alive = false; browser.storage.onChanged.removeListener(changed); };
  }, []);
  return { store, error };
}
