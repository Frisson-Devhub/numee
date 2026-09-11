/**
 * Build-time feature flags.
 *
 * Next inlines `process.env.NEXT_PUBLIC_*` at build time, so each flag must reference the
 * full member expression literally — reading them dynamically (e.g. `process.env[name]`)
 * yields `undefined` in the browser bundle. Values come from the monorepo root `.env`,
 * which `next.config.ts` loads before the bundler runs.
 */

/** Treat only an explicit opt-in as enabled, so an unset or malformed value stays off. */
function isEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}

/**
 * Render the LiveKit audio visualizer on the AI questionnaire stage instead of the
 * Anam avatar video. Off unless `NEXT_PUBLIC_USE_LIVEKIT_VISUALIZER` is `true`/`1`.
 */
export const USE_LIVEKIT_AUDIO_VISUALIZER = isEnabled(
  process.env.NEXT_PUBLIC_USE_LIVEKIT_VISUALIZER,
);
