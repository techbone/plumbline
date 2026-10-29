import type { CodeCheck } from "./liveness";

export type Verdict = {
  status: "verified" | "short" | "review" | "not_verified";
  headline: string;
  reasons: string[];
};

/** The release rule. Pure, so it's easy to test and to explain in the report. */
export function decide(code: CodeCheck, confirmed: number, review: number, target?: number): Verdict {
  const reasons: string[] = [];
  if (code.status === "failed") {
    reasons.push(code.note);
    return { status: "not_verified", headline: "Not verified: the visit code wasn't on camera", reasons };
  }
  if (code.status === "review") reasons.push(code.note);
  if (target === undefined) {
    return { status: code.status === "passed" ? "verified" : "review", headline: `At least ${confirmed} blocks counted`, reasons };
  }
  if (confirmed >= target) {
    return {
      status: code.status === "passed" ? "verified" : "review",
      headline: `${confirmed} of ${target} blocks confirmed`,
      reasons,
    };
  }
  if (confirmed + review >= target) {
    reasons.push(`${review} blocks were seen in only one frame; a person should check them`);
    return { status: "review", headline: `${confirmed} confirmed, ${review} to check, target ${target}`, reasons };
  }
  reasons.push(`${target - confirmed - review} blocks short of the milestone`);
  return { status: "short", headline: `Short: ${confirmed} of ${target} blocks`, reasons };
}
