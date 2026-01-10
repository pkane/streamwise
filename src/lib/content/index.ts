// src/lib/content/index.ts
// Show-fetching logic using the streaming-availability API

import type { UserProfile, Show } from "../../models/types";
import { searchShowsByFilters } from "./streamingAvailability";

/**
 * Fetch shows for the given user from the streaming-availability API.
 *
 * @param user - User profile with genre preferences
 * @param services - Optional list of service IDs to filter by
 */
export async function fetchShowsForUser(
    user: UserProfile,
    services?: string[]
): Promise<Show[]> {
    const genres = user.genres?.length ? user.genres : ["crime"];

    try {
        const shows = await searchShowsByFilters(
            services ?? [],
            genres,
            "us",
            "series"
        );
        return shows;
    } catch (e) {
        console.debug("fetchShowsForUser - API call failed", e);
        return [];
    }
}

export default { fetchShowsForUser };
