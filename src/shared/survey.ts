import { SHEET_URL } from "./config";

export type SurveyRecord = {
  id: string;
  brand: string;
  status: "완료" | "미완료";
  reason: string;
  startedAt: string;
  endedAt: string;
  lastQuestion: number;
  answered: number;
  code: string;
  typeName: string;
  answers: string[];
  version: string;
  channel: string;
  source: string;
};

const QUEUE_KEY = "coffee-dna-queue";
const ACTIVE_KEY = "coffee-dna-active";

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable. */ }
}

async function post(record: SurveyRecord) {
  // text/plain keeps this a simple request, which Apps Script web apps accept cross-origin.
  const response = await fetch(SHEET_URL, { method: "POST", body: JSON.stringify(record), signal: AbortSignal.timeout(20000) });
  const body = await response.json() as { ok?: boolean };
  if (!body.ok) throw new Error("rejected");
}

let flushing: Promise<void> | null = null;
function flush() {
  if (flushing) return flushing;
  const run = (async () => {
    // Re-read the queue each round so records added while sending are delivered by this same run.
    for (let record = read<SurveyRecord[]>(QUEUE_KEY, [])[0]; record; record = read<SurveyRecord[]>(QUEUE_KEY, [])[0]) {
      await post(record);
      const sent = record;
      write(QUEUE_KEY, read<SurveyRecord[]>(QUEUE_KEY, []).filter(item => item.id !== sent.id));
    }
  })();
  flushing = run;
  // Clear only after the assignment above: an empty queue finishes before it would otherwise be set.
  const clear = () => { if (flushing === run) flushing = null; };
  run.then(clear, clear);
  return run;
}

/** Queues the record and tries to deliver it. Resolves false while it is still waiting to be sent. */
export async function sendRecord(record: SurveyRecord) {
  if (!SHEET_URL) { console.info("SHEET_URL is not set; response not sent.", record); return true; }
  const queue = read<SurveyRecord[]>(QUEUE_KEY, []).filter(item => item.id !== record.id);
  write(QUEUE_KEY, [...queue, record].slice(-500));
  try { await flush(); } catch { /* Stays queued for the next attempt. */ }
  return !read<SurveyRecord[]>(QUEUE_KEY, []).some(item => item.id === record.id);
}

/** Remembers the test in progress so it can be reported if the page closes before it ends. */
export function saveActive(record: SurveyRecord | null) { write(ACTIVE_KEY, record); }

/** On load: report a test that was cut off by closing the page, and retry anything still queued. */
export function recoverPending() {
  const active = read<SurveyRecord | null>(ACTIVE_KEY, null);
  write(ACTIVE_KEY, null);
  if (active) void sendRecord({ ...active, status: "미완료", reason: "페이지 이탈" });
  else if (SHEET_URL) void flush().catch(() => {});
}
