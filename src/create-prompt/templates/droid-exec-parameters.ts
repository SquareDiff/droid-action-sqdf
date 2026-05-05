import type { ReviewExecProfile } from "../../utils/review-depth";

/** Inlined into review prompts so the model knows which CLI profile is active. */
export function formatDroidExecParametersBlock(
  profile: ReviewExecProfile,
): string {
  const effort =
    profile.reasoningEffort != null && profile.reasoningEffort !== ""
      ? `- Reasoning effort (\`--reasoning-effort\`): \`${profile.reasoningEffort}\``
      : "- Reasoning effort: *(unset in workflow — depth preset / provider default)*";

  return `<droid_exec_parameters>
<!-- DROID_EXEC_PARAMETERS_v1 — grep this in Actions logs to confirm disclosure -->
These values mirror the **actual \`droid\` CLI flags** for this job (\`--model\`, optional \`--reasoning-effort\`). Treat them as authoritative when calibrating analysis depth and uncertainty.

- CLI model (\`--model\`): \`${profile.model}\`
${effort}
- Review depth preset (workflow input \`review_depth\`): \`${profile.reviewDepth}\`
</droid_exec_parameters>

You are executing this review run under the Droid Exec configuration above. When writing any summary for humans (including metadata in exported JSON fields), explicitly name this model.`;
}
