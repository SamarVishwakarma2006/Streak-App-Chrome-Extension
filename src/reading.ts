// Shared reading rules. Browser evidence is local and can be fabricated by a device owner.
import type { PrototypeLedger } from './streaks';
import type { CloudBinding } from './cloud';
export const GFG_KEY = 'gfgReading';
export const GFG_ORIGIN = 'https://www.geeksforgeeks.org/*';
export const GFG_SCRIPT = 'gfg-reader';
export type Article = { url: string; title: string; fingerprint: string; weights: number[]; dwell: number[]; seconds: number; byDate: Record<string, number>; goalId: string; completed: boolean; qualifiedOn?: string; completedAt?: number; cloud?: CloudBinding; chunk: number };
export type PendingAward = { id: string; goalId: string; activity: string; amount: number; unit: 'minutes' | 'lessons'; at: number; attempts: number; retryAt: number; error?: string };
export type ReadingState = { version: 1; goalId: string | null; timezone: string; articles: Record<string, Article>; ledger: PrototypeLedger; pending?: PendingAward[] };
export function articleURL(input: string): string {
  const url = new URL(input);
  if (url.origin !== 'https://www.geeksforgeeks.org' || url.username || url.password ||
    !/^\/(python|dsa)\/[a-z0-9-]+\/$/.test(url.pathname) ||
    /tutorial|interview-questions|quiz|practice|examples|category/.test(url.pathname) ||
    ['/python/python/', '/dsa/dsa-tutorial-learn-data-structures-and-algorithms/'].includes(url.pathname)) throw new Error('Unsupported GeeksforGeeks page. Open a free Python or DSA article.');
  url.search = ''; url.hash = ''; return url.href;
}
export function readingResult(article: Article) {
  const words = article.weights.reduce((a, b) => a + b, 0);
  const covered = article.weights.reduce((sum, weight, i) => sum + (article.dwell[i]! >= Math.max(2, Math.ceil(weight * .3)) ? weight : 0), 0);
  const required = Math.max(60, Math.ceil(words * .3));
  return { coverage: Math.floor(covered / words * 100), required, qualified: covered >= words * .8 && article.seconds >= required };
}
export function applyReading(article: Article, indices: number[], elapsed: number, date: string) {
  if (!(elapsed > 0 && elapsed <= 1) || indices.length === 0) return;
  article.seconds += elapsed;
  article.byDate[date] = (article.byDate[date] ?? 0) + elapsed;
  for (const i of new Set(indices)) if (Number.isInteger(i) && i >= 0 && i < article.weights.length) article.dwell[i] = Math.min(Math.max(2, Math.ceil(article.weights[i]! * .3)), article.dwell[i]! + elapsed);
}
