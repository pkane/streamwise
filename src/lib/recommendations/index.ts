// src/lib/recommendations/index.ts
// Placeholder for recommendation / relevance engine.
// TODO: Implement scoring logic, collaborative filters, and heuristics.

import type { UserService, Show, UserProfile } from "../../models/types";
import { mockShows } from "../../data/mockShows";

// scoreServiceValue: existing stub — keeps services ordered by relevanceScore then price
export function scoreServiceValue(services: UserService[]) {
    return services.slice().sort((a, b) => {
        const aScore = (a.relevanceScore ?? 0) - a.monthlyPrice / 100;
        const bScore = (b.relevanceScore ?? 0) - b.monthlyPrice / 100;
        return bScore - aScore;
    });
}

// Recommend shows for a user given a pool of shows.
// Simple heuristic used for the mock:
//  - +10 points for each matching genre
//  - +popularity (0..100)
//  - +5 if show's service is marked `always` in user's services
// The MovieOfTheNight API uses provider + metadata fields; mirror shape in comments.
export function recommendShows(user: UserProfile, services: UserService[], pool?: Show[], limit = 6) {
    // pool defaults to all mockShows; in production we'd pass shows fetched for user
    const shows = pool ?? mockShows;

    const serviceStatusById = new Map<string, UserService>();
    services.forEach((s) => serviceStatusById.set(s.serviceId, s));

    const scored = shows.map((show) => {
        let score = 0;
        // genre matches
        for (const g of show.genres) {
            if (user.genres.includes(g)) score += 10;
        }
        // popularity bonus
        score += show.popularity ?? 0;

        const svc = serviceStatusById.get(show.serviceId);
        if (svc && svc.status === "always") score += 5;

        return { show, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.show);
}

export default { scoreServiceValue, recommendShows };
