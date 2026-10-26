export type HistoryRecord = {
  current: number; best: number; xp: number; today: string; timezone: string;
  completedToday: boolean; days: string[]; milestones: number[];
};
export type CloudHistory = {
  goals: { id: string; name: string; status: string }[];
  selectedId: string | null; record: HistoryRecord | null; fetchedAt: number;
};
export function monthDays(month: string): (string | null)[][] {
  if (!/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a month between 2000 and 2100.');
  const first = new Date(`${month}-01T00:00:00Z`);
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array((first.getUTCDay() + 6) % 7).fill(null);
  for (let day = 1; day <= count; day++) cells.push(`${month}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}
