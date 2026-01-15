import * as streamingAvailability from "streaming-availability";
import type { Show } from "../../models/types";
import { mapApiShowToShow, type ApiShow } from "../../models/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const RAPIDAPI_HOST = "streaming-availability.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "178f0cb199mshc0a4017a852f94ap1e28fdjsn49e504496aae";

/**
 * Search shows using the streaming-availability SDK.
 * Returns internal Show[] format (already mapped from API response).
 */
export async function searchShowsByFilters(
    catalogs: string[],
    genres: string[],
    country = "us",
    showType: "series" | "movie" = "series"
): Promise<Show[]> {
    const client = new streamingAvailability.Client(
        new streamingAvailability.Configuration({ apiKey: RAPIDAPI_KEY })
    );

    // The SDK's `searchShowsByFilters` expects an object with filters
    // Note: API uses snake_case for some params but SDK may convert them
    const params: any = {
        catalogs,
        country,
        showType,
        genresRelation: "or",
        ratingMin: 80
    };

    // Only add genres if we have valid ones (avoid empty array causing 400)
    if (genres && genres.length > 0) {
        params.genres = genres;
    }

    console.debug("searchShowsByFilters - calling API with params", { catalogs, genres, country, showType });

    try {
        const resp = await client.showsApi.searchShowsByFilters(params as any);

        // Extract the shows array from the response
        const apiShows = extractArrayFromResponse(resp) as ApiShow[];

        if (!apiShows || apiShows.length === 0) {
            console.debug("searchShowsByFilters - no shows found", { keys: Object.keys(resp ?? {}) });
            return [];
        }

        // Map API shows to our internal format
        return apiShows.map((apiShow) => mapApiShowToShow(apiShow, country));
    } catch (err: any) {
        if (err.response) {
            try {
                const errorBody = await err.response.text();
                console.debug("searchShowsByFilters - API error response body:", errorBody);
            } catch {
                console.debug("searchShowsByFilters - could not read error body");
            }
        }
        throw err;
    }
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
    const countryOptions = streamingOptions[country];
    if (Array.isArray(countryOptions) && countryOptions.length > 0) {
        return countryOptions[0]?.service?.id ?? "unknown";
    }
    return "unknown";
}