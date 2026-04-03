// src/lib/content/tmdb.ts
// Server-side enrichment using TMDB's TV Series Details endpoint.
// Populates `nextEpisodeAirDate` and `isReturningSoon` on Show objects.

import type { Show } from "../../models/types";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
// Enrich shows that aired within the past 2 years — wide enough to catch returning
// series like House of the Dragon (2024) when the current year is 2026.
const CANDIDATE_LOOKBACK_YEARS = 2;

interface TmdbTvDetails {
    status?: string; // e.g. "Returning Series", "Ended", "Canceled"
    next_episode_to_air?: { air_date?: string } | null;
    seasons?: Array<{ season_number: number; air_date?: string | null; episode_count?: number }>;
}

interface TmdbEnrichment {
    nextEpisodeAirDate: string | null;
    isReturningSoon: boolean;
}

async function fetchTmdbEnrichment(tmdbId: string): Promise<TmdbEnrichment> {
    const empty: TmdbEnrichment = { nextEpisodeAirDate: null, isReturningSoon: false };
    if (!TMDB_API_KEY) return empty;
    try {
        // streaming-availability returns tmdbId as "tv/12345" — strip the prefix
        const numericId = tmdbId.replace(/^(tv|movie)\//, "");
        const url = `${TMDB_BASE}/tv/${numericId}?api_key=${TMDB_API_KEY}`;
        const res = await fetch(url, { next: { revalidate: 3600 } } as RequestInit);
        if (!res.ok) return empty;
        const data = (await res.json()) as TmdbTvDetails;

        const nextEpisodeAirDate = data.next_episode_to_air?.air_date ?? null;

        // "Returning Series" with at least one numbered season that has no air date
        // and zero confirmed episodes — evidence of an announced-but-unscheduled season.
        const isReturningSoon =
            data.status === "Returning Series" &&
            (data.seasons ?? []).some(
                (s) => s.season_number > 0 && !s.air_date && (s.episode_count ?? 0) === 0
            );

        return { nextEpisodeAirDate, isReturningSoon };
    } catch {
        return empty;
    }
}

/**
 * Enriches shows with TMDB data for season badges.
 *
 * Candidates: shows with a tmdbId whose lastAirYear is within the past 2 years
 * (or current/future) — covers recently-active returning series.
 *
 * Sets:
 *   - `nextEpisodeAirDate` if next_episode_to_air is in the future and within 3 months
 *   - `isReturningSoon` if TMDB status is "Returning Series" with an unscheduled season
 */
export async function enrichShowsWithTmdbData(shows: Show[]): Promise<Show[]> {
    if (!TMDB_API_KEY) {
        console.debug("enrichShowsWithTmdbData - TMDB_API_KEY not set, skipping enrichment");
        return shows;
    }

    const nowMs = Date.now();
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - CANDIDATE_LOOKBACK_YEARS;

    const candidates = shows.filter(
        (s) => s.tmdbId && s.lastAirYear !== undefined && s.lastAirYear >= minYear
    );

    if (candidates.length === 0) return shows;

    console.debug("enrichShowsWithTmdbData - enriching", candidates.length, "candidate shows");

    const enriched = await Promise.all(
        candidates.map(async (show) => {
            const { nextEpisodeAirDate, isReturningSoon } = await fetchTmdbEnrichment(show.tmdbId!);

            const updates: Partial<Show> = {};

            if (nextEpisodeAirDate) {
                const airMs = new Date(nextEpisodeAirDate).getTime();
                if (airMs > nowMs && airMs - nowMs <= THREE_MONTHS_MS) {
                    updates.nextEpisodeAirDate = nextEpisodeAirDate;
                }
            }

            if (isReturningSoon) {
                updates.isReturningSoon = true;
            }

            return Object.keys(updates).length ? { ...show, ...updates } : show;
        })
    );

    const enrichedById = new Map(enriched.map((s) => [s.showId, s]));
    return shows.map((s) => enrichedById.get(s.showId) ?? s);
}
