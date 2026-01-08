// src/lib/content/index.ts
// Placeholder for show-fetching logic: fetching/parsing streaming catalogs

import type { UserProfile, Show } from "../../models/types";
import { mockShows } from "../../data/mockShows";

// Fetch shows for the given user. Currently this returns the local mock dataset
export async function fetchShowsForUser(user: UserProfile): Promise<Show[]> {
    // If user has specified genres, prioritize those; otherwise return all
    const preferred = user.genres && user.genres.length > 0;

    const filtered = mockShows.filter((s) => {
        if (!preferred) return true;
        // keep show if any genre overlaps user's genres
        return s.genres.some((g) => user.genres.includes(g));
    });

    // In a real implementation, we'd also filter by services the user subscribes to.
    return filtered;
}

export default { fetchShowsForUser };