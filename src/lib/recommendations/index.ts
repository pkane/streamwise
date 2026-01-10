// src/lib/recommendations/index.ts
// Recommendation / relevance engine for scoring and ranking shows.

import type { UserService, Show, UserProfile } from "../../models/types";

// scoreServiceValue: keeps services ordered by relevanceScore then price
export function scoreServiceValue(services: UserService[]) {
    return services.slice().sort((a, b) => {
        const aScore = (a.relevanceScore ?? 0) - a.monthlyPrice / 100;
        const bScore = (b.relevanceScore ?? 0) - b.monthlyPrice / 100;
        return bScore - aScore;
    });
}

/**
 * Recommend shows for a user given a pool of shows.
 * Scoring heuristic:
 *  - +10 points for each matching genre (case-insensitive)
 *  - +popularity (0..100)
 *  - +5 if show's service is marked `always` in user's services
 *
 * @param user - User profile with genre preferences
 * @param services - User's streaming services with status
 * @param pool - Shows to score and rank (required - no mock fallback)
 * @param limit - Max number of shows to return
 */
export function recommendShows(
    user: UserProfile,
    services: UserService[],
    pool: Show[],
    limit = 6
): Show[] {
    if (!pool || pool.length === 0) {
        return [];
    }

    const serviceStatusById = new Map<string, UserService>();
    services.forEach((s) => serviceStatusById.set(s.serviceId, s));

    // Normalize user genres to lowercase for comparison
    const userGenresLower = user.genres.map((g) => g.toLowerCase());

    const scored = pool.map((show) => {
        let score = 0;

        // Genre matches (case-insensitive)
        for (const g of show.genres) {
            if (userGenresLower.includes(g.toLowerCase())) {
                score += 10;
            }
        }

        // Popularity bonus
        score += show.popularity ?? 0;

        // Service preference bonus
        const svc = serviceStatusById.get(show.serviceId);
        if (svc && svc.status === "always") {
            score += 5;
        }

        return { show, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.show);
}

export default { scoreServiceValue, recommendShows };
