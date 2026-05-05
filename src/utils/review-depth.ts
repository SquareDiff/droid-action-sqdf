export enum ReviewDepth {
  Shallow = "shallow",
  Deep = "deep",
}

const SHALLOW_DEFAULTS = {
  model: "kimi-k2-0711",
  reasoningEffort: undefined as string | undefined,
};

const DEEP_DEFAULTS = {
  model: "gpt-5.2",
  reasoningEffort: "high" as string | undefined,
};

export const REVIEW_DEPTH_PRESETS: Record<
  ReviewDepth,
  { model: string; reasoningEffort: string | undefined }
> = {
  [ReviewDepth.Shallow]: SHALLOW_DEFAULTS,
  [ReviewDepth.Deep]: DEEP_DEFAULTS,
};

/**
 * Resolve the effective review model and reasoning effort based on depth.
 * Explicit overrides (review_model, reasoning_effort) take priority over depth presets.
 */
export function resolveReviewConfig(options?: {
  reviewModel?: string;
  reasoningEffort?: string;
  reviewDepth?: string;
}): { model: string; reasoningEffort: string | undefined } {
  const depth = (options?.reviewDepth || ReviewDepth.Deep) as ReviewDepth;
  const defaults =
    REVIEW_DEPTH_PRESETS[depth] ?? REVIEW_DEPTH_PRESETS[ReviewDepth.Shallow];

  return {
    model: options?.reviewModel || defaults.model,
    reasoningEffort: options?.reasoningEffort || defaults.reasoningEffort,
  };
}

/** Effective Droid CLI profile for code review (matches `--model` / `--reasoning-effort`). */
export type ReviewExecProfile = {
  model: string;
  reasoningEffort: string | undefined;
  /** Raw `REVIEW_DEPTH` workflow input (e.g. `deep`, `shallow`). */
  reviewDepth: string;
};

/**
 * Read the same env vars the review command uses to build `droid` CLI args.
 * Callers inline this into prompts so the model knows which configuration it is running under.
 */
export function resolveCodeReviewExecProfileFromEnv(): ReviewExecProfile {
  const reviewDepth = process.env.REVIEW_DEPTH?.trim() || ReviewDepth.Deep;

  const { model, reasoningEffort } = resolveReviewConfig({
    reviewModel: process.env.REVIEW_MODEL?.trim(),
    reasoningEffort: process.env.REASONING_EFFORT?.trim(),
    reviewDepth,
  });

  return { model, reasoningEffort, reviewDepth };
}
