// src/lib/content/index.ts
// Placeholder for show-fetching logic: fetching/parsing streaming catalogs

import type { UserProfile, Show } from "../../models/types";
import { mockShows } from "../../data/mockShows";

// Fetch shows for the given user. Currently this returns the local mock dataset
export async function fetchShowsForUser(user: UserProfile, services?: string[]): Promise<Show[]> {
    // If user has specified genres, prioritize those; otherwise return all
    const preferred = user.genres && user.genres.length > 0;

    const filtered = mockShows.filter((s) => {
        if (preferred && !s.genres.some((g) => user.genres.includes(g))) return false;
        // If a set of services was supplied, only include shows available on those services
        if (services && services.length > 0) {
            return services.includes(s.serviceId);
        }
        return true;
    });

    // In a real implementation, we'd also filter by services the user subscribes to.
    return filtered;
}

export default { fetchShowsForUser };