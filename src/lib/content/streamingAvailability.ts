import * as streamingAvailability from "streaming-availability";

/* eslint-disable @typescript-eslint/no-explicit-any */
const RAPIDAPI_HOST = "streaming-availability.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "178f0cb199mshc0a4017a852f94ap1e28fdjsn49e504496aae";

export async function searchShowsByFilters(catalogs: string[], genres: string[], country = "us", showType = "series") {
    const client = new streamingAvailability.Client(new streamingAvailability.Configuration({ apiKey: RAPIDAPI_KEY }));

    console.log(catalogs)

    // The SDK's `searchShowsByFilters` expects an object with filters
    const params: any = {
        catalogs,
        country,
        genres,
        showType,
    };

    console.debug("searchShowsByFilters - params", params);

    const resp = await client.showsApi.searchShowsByFilters(params as any);

    // Response shape may vary; prefer `results` if present
    // Return the raw response array for downstream mapping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyResp: any = resp;

    function extractArrayFromResponse(obj: any): any[] | undefined {
        if (!obj) return undefined;
        if (Array.isArray(obj)) return obj;
        if (Array.isArray(obj.results)) return obj.results;
        if (obj.data && Array.isArray(obj.data)) return obj.data;
        if (obj.data && Array.isArray(obj.data.results)) return obj.data.results;
        if (Array.isArray(obj.body)) return obj.body;
        if (Array.isArray(obj.shows)) return obj.shows;
        // Fallback: find first array value on the object
        for (const k of Object.keys(obj)) {
            if (Array.isArray(obj[k])) return obj[k];
        }
        return undefined;
    }

    const extracted = extractArrayFromResponse(anyResp);
    if (Array.isArray(extracted)) {
        // Return the array even if it's empty — caller expects an array when present
        return extracted;
    }

    // No array could be located in the response; log for debugging and return an empty list
    console.debug("searchShowsByFilters - unexpected response shape", { keys: Object.keys(anyResp), resp: anyResp });
    return [];
}

type RapidResult = any;

export async function fetchShowsFromRapidAPI(genres: string[], country = "us", maxPerGenre = 10) {
    const all: any[] = [];
    for (const genre of genres) {
        try {
            const q = new URLSearchParams({
                country,
                genre,
                type: "series",
                page: "1",
                // Depending on the endpoint behavior you may add more params here
            });
            const res = await fetch(`https://${RAPIDAPI_HOST}/search/basic?${q.toString()}`, {
                headers: {
                    "X-RapidAPI-Key": RAPIDAPI_KEY,
                    "X-RapidAPI-Host": RAPIDAPI_HOST,
                },
            });
            if (!res.ok) continue;
            const data: RapidResult = await res.json();
            const results = data.results ?? data; // adapt depending on exact response shape
            for (const r of results.slice(0, maxPerGenre)) {
                all.push({
                    id: r.imdb_id ?? r.id ?? r.title,
                    title: r.title ?? r.name,
                    genres: r.genre ? (Array.isArray(r.genre) ? r.genre : [r.genre]) : [genre],
                    overview: r.overview ?? r.description ?? "",
                    poster: r.posterURLs ? r.posterURLs["92"] ?? null : r.posterPath ?? null,
                    streamingInfo: r.streamingInfo ?? {},
                    raw: r
                });
            }
        } catch (e) {
            // ignore and continue; you may want to log in development
        }
    }
    // dedupe by id
    const map = new Map<string, any>();
    for (const s of all) {
        map.set(String(s.id), s);
    }
    return Array.from(map.values());
}