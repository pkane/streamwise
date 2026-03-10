// src/lib/content/tmdb.ts
// Server-side enrichment using TMDB's TV Series Details endpoint.
// Adds `nextEpisodeAirDate` to shows that have an upcoming episode within 3 months.

import type { Show } from "../../models/types";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

interface TmdbTvDetails {
    next_episode_to_air?: {
        air_date?: string; // "YYYY-MM-DD"
    } | null;
}

async function fetchNextEpisodeAirDate(tmdbId: string): Promise<string | null> {
    if (!TMDB_API_KEY) return null;
    try {
        const url = `${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const res = await fetch(url, { next: { revalidate: 3600 } } as RequestInit);
        if (!res.ok) return null;
        const data = (await res.json()) as TmdbTvDetails;
        return data.next_episode_to_air?.air_date ?? null;
    } catch {
        return null;
    }
}

/**
 * Enriches shows with TMDB `next_episode_to_air` data.
 * Only queries TMDB for shows that have a tmdbId and whose lastAirYear is
 * current or future (the only candidates where an upcoming episode is plausible).
 * Results are fetched in parallel and merged back by showId.
 */
export async function enrichShowsWithTmdbData(shows: Show[]): Promise<Show[]> {
    if (!TMDB_API_KEY) {
        console.debug("enrichShowsWithTmdbData - TMDB_API_KEY not set, skipping enrichment");
        return shows;
    }

    const nowMs = Date.now();
    const currentYear = new Date().getFullYear();

    // Only enrich shows that could plausibly have an upcoming episode
    const candidates = shows.filter(
        (s) => s.tmdbId && s.lastAirYear !== undefined && s.lastAirYear >= currentYear
    );

    if (candidates.length === 0) return shows;

    console.debug("enrichShowsWithTmdbData - enriching", candidates.length, "candidate shows");

    // Fetch in parallel
    const enriched = await Promise.all(
        candidates.map(async (show) => {
            const airDate = await fetchNextEpisodeAirDate(show.tmdbId!);
            if (!airDate) return show;

            const airMs = new Date(airDate).getTime();
            // Only attach dates that are in the future and within 3 months
            if (airMs > nowMs && airMs - nowMs <= THREE_MONTHS_MS) {
                return { ...show, nextEpisodeAirDate: airDate };
            }
            return show;
        })
    );

    // Merge enriched back into the full list by showId
    const enrichedById = new Map(enriched.map((s) => [s.showId, s]));
    return shows.map((s) => enrichedById.get(s.showId) ?? s);
}
