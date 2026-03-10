import * as streamingAvailability from "streaming-availability";
import type { Show } from "../../models/types";
import { mapApiShowToShow, type ApiShow } from "../../models/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const RAPIDAPI_HOST = "streaming-availability.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "178f0cb199mshc0a4017a852f94ap1e28fdjsn49e504496aae";

/**
 * Search shows using the streaming-availability SDK.
 * Follows cursor pagination until `maxResults` shows are collected or the API
 * reports no more results. Capped at 3 API calls to bound latency.
 *
 * @param maxResults - target number of shows to return (default 20, one page)
 */
export async function searchShowsByFilters(
    catalogs: string[],
    genres: string[],
    country = "us",
    showType: "series" | "movie" = "series",
    maxResults = 20
): Promise<Show[]> {
    const client = new streamingAvailability.Client(
        new streamingAvailability.Configuration({ apiKey: RAPIDAPI_KEY })
    );

    const results: Show[] = [];
    let cursor: string | undefined;
    const MAX_PAGES = 3; // 3 × 20 = 60 max; enough to satisfy a 48-show target

    console.debug("searchShowsByFilters - starting paginated fetch", { catalogs, genres, country, showType, maxResults });

    for (let page = 0; page < MAX_PAGES && results.length < maxResults; page++) {
        const params: any = {
            catalogs,
            country,
            showType,
            genresRelation: "or",
            ratingMin: 80,
        };
        if (genres && genres.length > 0) params.genres = genres;
        if (cursor) params.cursor = cursor;

        try {
            const resp = await client.showsApi.searchShowsByFilters(params as any);

            const apiShows: ApiShow[] = resp.shows ?? (extractArrayFromResponse(resp) as ApiShow[]) ?? [];
            if (apiShows.length === 0) {
                console.debug("searchShowsByFilters - empty page", { page });
                break;
            }

            results.push(...apiShows.map((s) => mapApiShowToShow(s, country, catalogs)));
            console.debug("searchShowsByFilters - page", page + 1, "fetched", apiShows.length, "total", results.length);

            if (!resp.hasMore || !resp.nextCursor) break;
            cursor = resp.nextCursor;
        } catch (err: any) {
            if (err.response) {
                try {
                    const errorBody = await err.response.text();
                    console.debug("searchShowsByFilters - API error body:", errorBody);
                } catch {
                    console.debug("searchShowsByFilters - could not read error body");
                }
            }
            throw err;
        }
    }

    return results.slice(0, maxResults);
}

function extractArrayFromResponse(obj: any): any[] | undefined {
    if (!obj) return undefined;
    if (Array.isArray(obj)) return obj;
    if (Array.isArray(obj.shows)) return obj.shows;
    if (Array.isArray(obj.results)) return obj.results;
    if (obj.data && Array.isArray(obj.data)) return obj.data;
    if (obj.data && Array.isArray(obj.data.results)) return obj.data.results;
    if (Array.isArray(obj.body)) return obj.body;
    // Fallback: find first array value on the object
    for (const k of Object.keys(obj)) {
        if (Array.isArray(obj[k])) return obj[k];
    }
    return undefined;
}

/**
 * Alternative fetch using REST endpoint directly.
 * Returns internal Show[] format.
 */
export async function fetchShowsFromRapidAPI(
    genres: string[],
    country = "us",
    maxPerGenre = 10
): Promise<Show[]> {
    const all: Show[] = [];
    for (const genre of genres) {
        try {
            const q = new URLSearchParams({
                country,
                genre,
                type: "series",
                page: "1",
            });
            const res = await fetch(`https://${RAPIDAPI_HOST}/search/basic?${q.toString()}`, {
                headers: {
                    "X-RapidAPI-Key": RAPIDAPI_KEY,
                    "X-RapidAPI-Host": RAPIDAPI_HOST,
                },
            });
            if (!res.ok) continue;
            const data = await res.json();
            const results = data.results ?? data;
            for (const r of results.slice(0, maxPerGenre)) {
                // Map raw REST response to our Show format
                const show: Show = {
                    showId: r.imdbId ?? r.id ?? r.title,
                    title: r.title ?? r.name,
                    year: r.releaseYear ?? r.firstAirYear ?? r.year,
                    genres: r.genres
                        ? r.genres.map((g: any) => (typeof g === "string" ? g : g.id))
                        : [genre],
                    serviceId: extractServiceId(r.streamingOptions ?? r.streamingInfo, country),
                    popularity: r.rating ? Math.round(r.rating * 10) : undefined,
                    overview: r.overview ?? r.description ?? "",
                    actors: r.cast?.slice(0, 2),
                    imageSet: r.imageSet,
                    streamingOptions: r.streamingOptions ?? r.streamingInfo,
                };
                all.push(show);
            }
        } catch (e) {
            console.debug("fetchShowsFromRapidAPI - error fetching genre", genre, e);
        }
    }
    // dedupe by showId
    const map = new Map<string, Show>();
    for (const s of all) {
        map.set(s.showId, s);
    }
    return Array.from(map.values());
}

function extractServiceId(streamingOptions: any, country: string): string {
    if (!streamingOptions) return "unknown";
    const countryOptions = Array.isArray(streamingOptions[country])
        ? (streamingOptions[country] as { type?: string; service?: { id?: string } }[])
              .filter((o) => o?.type === "subscription")
        : [];
    return countryOptions[0]?.service?.id ?? "unknown";
}