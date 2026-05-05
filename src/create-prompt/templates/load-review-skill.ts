import * as fs from "node:fs";
import * as path from "node:path";

let cached: string | undefined;

/**
 * Returns the inline review skill methodology.
 *
 * Upstream droid-action tells Droid to "Invoke the 'review' skill" — a name
 * lookup that resolves to Factory's private skill registry inside the Droid
 * CLI. This SquareDiff fork inlines the skill content directly into the
 * prompt instead, so candidate branches in this fork can hill-climb the
 * methodology without depending on the private registry.
 *
 * The skill body lives next to this file as `review-skill.md` and is kept
 * in sync from the harness repo via `harness/sync_skill.py`. YAML frontmatter
 * (loader metadata such as name/version/description) is stripped at load time
 * because it is not instructions for Droid.
 *
 * The leading sentinel comment (`SKILL_OVERRIDE_v1`) is intentional: it is
 * grep-able in the GitHub Actions log so we can confirm Droid received this
 * fork's methodology rather than the built-in one.
 */
export function getReviewSkill(): string {
  if (cached !== undefined) return cached;
  const skillPath = path.join(import.meta.dir, "review-skill.md");
  const raw = fs.readFileSync(skillPath, "utf8");
  const stripped = raw.replace(/^---[\s\S]*?---\s*\n?/, "").trim();
  cached = `<!-- SKILL_OVERRIDE_v1 -->\n\n${stripped}`;
  return cached;
}
