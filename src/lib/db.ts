import Database from "better-sqlite3";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");

export type StepName = "received" | "code" | "frames" | "count" | "stitch" | "verdict";
export type StepStatus = "pending" | "running" | "passed" | "failed" | "review";

export const STEPS: { name: StepName; label: string }[] = [
  { name: "received", label: "Video received" },
  { name: "code", label: "Visit code checked" },
  { name: "frames", label: "Frames extracted" },
  { name: "count", label: "Blocks counted" },
  { name: "stitch", label: "Wall stitched" },
  { name: "verdict", label: "Report ready" },
];

export type Project = {
  id: string;
  name: string;
  site: string;
  owner_name: string;
  capture_token: string;
  created_at: string;
};

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  kind: "blocks" | "openings" | "stage";
  target: number;
  tranche_ngn: number;
  sort: number;
};

export type Visit = {
  id: string;
  project_id: string;
  milestone_id: string | null;
  code: string;
  code_expires_at: string;
  status: "awaiting_video" | "processing" | "done" | "failed";
  video_path: string | null;
  created_at: string;
  submitted_at: string | null;
  result_json: string | null;
};

export type Step = {
  visit_id: string;
  name: StepName;
  status: StepStatus;
  detail: string | null;
  started_at: string | null;
  finished_at: string | null;
};

const globalForDb = globalThis as unknown as { plumblineDb?: Database.Database };

export function db(): Database.Database {
  if (globalForDb.plumblineDb) return globalForDb.plumblineDb;
  mkdirSync(DATA_DIR, { recursive: true });
  const d = new Database(join(DATA_DIR, "plumbline.db"));
  d.pragma("journal_mode = WAL");
  d.exec(`
    create table if not exists projects (
      id text primary key, name text not null, site text not null, owner_name text not null,
      capture_token text not null unique, created_at text not null default (datetime('now'))
    );
    create table if not exists milestones (
      id text primary key, project_id text not null references projects(id), title text not null,
      kind text not null, target integer not null, tranche_ngn integer not null, sort integer not null
    );
    create table if not exists visits (
      id text primary key, project_id text not null references projects(id), milestone_id text,
      code text not null, code_expires_at text not null, status text not null,
      video_path text, created_at text not null default (datetime('now')), submitted_at text, result_json text
    );
    create table if not exists steps (
      visit_id text not null references visits(id), name text not null, status text not null,
      detail text, started_at text, finished_at text, primary key (visit_id, name)
    );
  `);
  seed(d);
  globalForDb.plumblineDb = d;
  return d;
}

export function id(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

/** Four characters with no look-alikes (0/O, 1/I/L), easy to chalk on a block. */
export function visitCode(): string {
  const alphabet = "ACDEFGHJKMNPQRTUVWXY34679";
  const bytes = randomBytes(4);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function seed(d: Database.Database) {
  const exists = d.prepare("select 1 from projects limit 1").get();
  if (exists) return;
  const projectId = "prj_demo";
  d.prepare(
    "insert into projects (id, name, site, owner_name, capture_token) values (?, ?, ?, ?, ?)",
  ).run(projectId, "Boundary wall and bungalow", "Plot 14, Kuje, Abuja", "Musa E.", "demo");
  const ms = d.prepare(
    "insert into milestones (id, project_id, title, kind, target, tranche_ngn, sort) values (?, ?, ?, ?, ?, ?, ?)",
  );
  ms.run("ms_fence", projectId, "Boundary wall, east run", "blocks", 230, 1_150_000, 1);
  ms.run("ms_vents", projectId, "Drainage vents in place", "openings", 8, 120_000, 2);
  ms.run("ms_lintel", projectId, "Ground floor walls to lintel", "blocks", 1800, 4_500_000, 3);
}

export function projectByToken(token: string): Project | undefined {
  return db().prepare("select * from projects where capture_token = ?").get(token) as Project | undefined;
}

export function milestonesFor(projectId: string): Milestone[] {
  return db().prepare("select * from milestones where project_id = ? order by sort").all(projectId) as Milestone[];
}

export function getVisit(visitId: string): Visit | undefined {
  return db().prepare("select * from visits where id = ?").get(visitId) as Visit | undefined;
}

export function stepsFor(visitId: string): Step[] {
  return db().prepare("select * from steps where visit_id = ?").all(visitId) as Step[];
}

export function setStep(visitId: string, name: StepName, status: StepStatus, detail?: unknown) {
  const now = new Date().toISOString();
  db()
    .prepare(
      `insert into steps (visit_id, name, status, detail, started_at, finished_at)
       values (@visitId, @name, @status, @detail, @now, case when @status in ('passed','failed','review') then @now end)
       on conflict (visit_id, name) do update set
         status = excluded.status,
         detail = coalesce(excluded.detail, steps.detail),
         finished_at = case when excluded.status in ('passed','failed','review') then @now else null end`,
    )
    .run({ visitId, name, status, detail: detail === undefined ? null : JSON.stringify(detail), now });
}

export function visitDir(visitId: string): string {
  const dir = join(DATA_DIR, "visits", visitId);
  mkdirSync(dir, { recursive: true });
  return dir;
}
