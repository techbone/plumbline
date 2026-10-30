import { randomBytes } from "node:crypto";
import { getObject, putObject } from "./storage";

/**
 * Projects and milestones. The demo site lives in code; test sites made on
 * /new are write-once objects in storage, keyed by an unguessable id that is
 * also the foreman's link (/v/<id>) and the owner's page (/p/<id>). No database.
 */

export type Milestone = {
  id: string;
  title: string;
  kind: "blocks" | "openings";
  target: number;
  trancheNgn: number;
};

export type Project = {
  id: string;
  name: string;
  site: string;
  owner: string;
  captureToken: string;
  milestones: Milestone[];
  /** Made on /new by someone trying the app, not a real site. */
  sandbox?: boolean;
};

export const PROJECTS: Project[] = [
  {
    id: "prj_demo",
    name: "Boundary wall and bungalow",
    site: "Plot 14, Kuje, Abuja",
    owner: "Musa E.",
    captureToken: "demo",
    milestones: [
      { id: "ms_fence", title: "Boundary wall, east run", kind: "blocks", target: 230, trancheNgn: 1_150_000 },
      { id: "ms_vents", title: "Drainage vents in place", kind: "openings", target: 8, trancheNgn: 120_000 },
      { id: "ms_lintel", title: "Ground floor walls to lintel", kind: "blocks", target: 1800, trancheNgn: 4_500_000 },
    ],
  },
];

const SANDBOX_ID = /^p_[0-9a-f]{10}$/;
const projectPath = (id: string) => `projects/${id}/project.json`;

/** Look a project up by its link token or id: the demo first, then test sites in storage. */
export async function getProject(key: string): Promise<Project | undefined> {
  const builtIn = PROJECTS.find((p) => p.captureToken === key || p.id === key);
  if (builtIn) return builtIn;
  if (!SANDBOX_ID.test(key)) return undefined;
  const buf = await getObject(projectPath(key));
  return buf ? (JSON.parse(buf.toString()) as Project) : undefined;
}

export type NewProject = { name: string; site: string; owner: string; milestoneTitle: string; target: number; trancheNgn: number };

/** Check and tidy what the /new form sent; returns an error message or the clean input. */
export function parseNewProject(raw: unknown): NewProject | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
  const out = {
    name: text(r.name, 60),
    site: text(r.site, 60),
    owner: text(r.owner, 40),
    milestoneTitle: text(r.milestoneTitle, 60),
    target: Math.round(Number(r.target)),
    trancheNgn: Math.round(Number(r.trancheNgn)),
  };
  if (!out.name || !out.site || !out.owner || !out.milestoneTitle) return "Fill in every field";
  if (!Number.isFinite(out.target) || out.target < 1 || out.target > 20_000) return "Block target must be between 1 and 20,000";
  if (!Number.isFinite(out.trancheNgn) || out.trancheNgn < 0 || out.trancheNgn > 1_000_000_000) return "Payment must be between ₦0 and ₦1,000,000,000";
  return out;
}

export async function createProject(input: NewProject): Promise<Project> {
  const id = `p_${randomBytes(5).toString("hex")}`;
  const project: Project = {
    id,
    name: input.name,
    site: input.site,
    owner: input.owner,
    captureToken: id,
    sandbox: true,
    milestones: [{ id: "ms_1", title: input.milestoneTitle, kind: "blocks", target: input.target, trancheNgn: input.trancheNgn }],
  };
  await putObject(projectPath(id), JSON.stringify(project), "application/json");
  return project;
}
