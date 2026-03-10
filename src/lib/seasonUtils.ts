import type { Show } from "../models/types";

export type SeasonLabel = "new" | "soon";

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Determines whether a show has a recently released season or an upcoming one.
 *
 * "new"  — a subscription streaming option has `availableSince` within the last 6 months.
 *           This is the most precise signal the streaming API provides (Unix timestamp).
 *
 * "soon" — the show has a confirmed next episode air date (from TMDB) within 3 months,
 *           OR its `lastAirYear` is in the future (year-granular fallback when TMDB data
 *           is unavailable).
 *
 * Returns null if neither condition applies.
 */
export function getSeasonLabel(show: Show, country = "us"): SeasonLabel | null {
    const nowMs = Date.now();
    const currentYear = new Date().getFullYear();

    // "Season coming soon" — precise: confirmed next episode within 3 months (TMDB)
    if (show.nextEpisodeAirDate) {
        const airMs = new Date(show.nextEpisodeAirDate).getTime();
        if (airMs > nowMs && airMs - nowMs <= THREE_MONTHS_MS) {
            return "soon";
        }
    }

    // "Season coming soon" — fallback: announced for a future year (year-granular)
    if (show.lastAirYear !== undefined && show.lastAirYear > currentYear) {
        return "soon";
    }

    // "New season" — only applies to shows currently airing this year,
    // where the streaming option was detected within the last 6 months.
    // Guards against finished shows that were recently added to a service.
    if (show.lastAirYear === currentYear) {
        const options = show.streamingOptions?.[country] as
            | Array<{ type?: string; availableSince?: number }>
            | undefined;

        if (options) {
            for (const opt of options) {
                if (opt?.type === "subscription" && typeof opt.availableSince === "number") {
                    const ageMs = nowMs - opt.availableSince * 1000; // API uses Unix seconds
                    if (ageMs >= 0 && ageMs <= SIX_MONTHS_MS) {
                        return "new";
                    }
                }
            }
        }
    }

    return null;
}
