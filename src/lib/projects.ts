/**
 * Projects and milestones live in code for the hackathon build: one demo site,
 * no database. Each project's capture token is the foreman's link (/v/<token>).
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

export function projectByToken(token: string): Project | undefined {
  return PROJECTS.find((p) => p.captureToken === token);
}

export function projectById(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id);
}
