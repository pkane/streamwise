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
    limit = 12
): Show[] {
    if (!pool || pool.length === 0) {
        return [];
    }

    const serviceStatusById = new Map<string, UserService>();
    services.forEach((s) => serviceStatusById.set(s.serviceId, s));

    // Normalize user genres to lowercase for comparison
    const userGenres = user.genres.map((g) => g.toLowerCase());

    const scored = pool.map((show) => {
        let score = 0;

        // Genre matches (case-insensitive)
        for (const g of show.genres) {
            if (userGenres.includes(g.toLowerCase())) {
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

/**
 * Show signal types from onboarding step 3b
 */
export type ShowSignal = "seen" | "skip" | "want";

/**
 * Options for recommendNextWatch function
 */
export interface RecommendNextWatchOptions {
    /** User's show signals from step 3b: { showId: "seen" | "skip" | "want" } */
    showSignals: Record<string, ShowSignal>;
    /** User's release preference from step 4: "weekly" | "binge" | "mixed" */
    releasePreference: "weekly" | "binge" | "mixed";
    /** User's target budget from step 5 (null = no budget limit) */
    targetBudget: number | null;
    /** Service statuses: { serviceId: "active" | "paused" | "always" } */
    serviceStatuses: Record<string, string>;
}

/**
 * Recommend shows to watch next, incorporating user signals and preferences.
 *
 * Logic:
 * 1. Filter out shows user has "seen" or marked as "skip" (not for me)
 * 2. Boost shows user marked as "want" to top of list
 * 3. If releasePreference is "weekly", include mid-season shows (could be airing now)
 * 4. Weight services: "always" gets highest boost, "active" gets moderate boost
 * 5. Larger budget allows searching across more services
 *
 * @param user - User profile with genre preferences
 * @param services - User's streaming services with status
 * @param pool - Shows to score and rank
 * @param options - Additional filtering/scoring options
 * @param limit - Max number of shows to return
 */
export function recommendNextWatch(
    user: UserProfile,
    services: UserService[],
    pool: Show[],
    options: RecommendNextWatchOptions,
    limit = 12
): Show[] {
    if (!pool || pool.length === 0) {
        return [];
    }

    const { showSignals, releasePreference, targetBudget, serviceStatuses } = options;

    // Build service lookup with statuses
    const serviceStatusById = new Map<string, string>();
    services.forEach((s) => {
        const status = serviceStatuses[s.serviceId] ?? s.status;
        serviceStatusById.set(s.serviceId, status);
    });

    // Calculate total monthly cost for active/always services
    const activeCost = services.reduce((sum, s) => {
        const status = serviceStatusById.get(s.serviceId) ?? "paused";
        return status !== "paused" ? sum + s.monthlyPrice : sum;
    }, 0);

    // Determine if we should search broader (user has budget room)
    const hasBudgetRoom = targetBudget === null || activeCost < targetBudget;

    // Normalize user genres to lowercase for comparison
    const userGenres = user.genres.map((g) => g.toLowerCase());

    // Filter and score shows
    const scored = pool
        .filter((show) => {
            const signal = showSignals[show.showId];
            // Filter out shows user has seen or doesn't want
            if (signal === "seen" || signal === "skip") {
                return false;
            }

            // If user has limited budget, only include shows from active/always services
            if (!hasBudgetRoom) {
                const svcStatus = serviceStatusById.get(show.serviceId);
                if (svcStatus === "paused" || !svcStatus) {
                    return false;
                }
            }

            return true;
        })
        .map((show) => {
            let score = 0;
            const signal = showSignals[show.showId];

            // Major boost for shows user wants to watch
            if (signal === "want") {
                score += 100;
            }

            // Genre matches (case-insensitive)
            for (const g of show.genres) {
                if (userGenres.includes(g.toLowerCase())) {
                    score += 10;
                }
            }

            // Popularity bonus
            score += show.popularity ?? 0;

            // Service preference bonus based on status
            const svcStatus = serviceStatusById.get(show.serviceId);
            if (svcStatus === "always") {
                score += 15; // Highest boost - user always wants this service
            } else if (svcStatus === "active") {
                score += 8; // Moderate boost - service is currently active
            }
            // "paused" services get no boost (but may still be included if budget allows)

            // Release preference handling
            // If user prefers week-to-week watching, we can surface shows that may be mid-season
            // This would require episodeCount or releaseStatus data from the API
            // For now, we add a small boost for newer shows when user prefers weekly
            if (releasePreference === "weekly") {
                // Assume shows with more recent year are potentially still airing
                const currentYear = new Date().getFullYear();
                if (show.year && show.year >= currentYear - 1) {
                    score += 5; // Small boost for recent shows that might have ongoing releases
                }
            }

            return { show, score };
        });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.show);
}

/**
 * Service with content value metrics
 */
export interface ServiceContentValue {
    serviceId: string;
    name: string;
    monthlyPrice: number;
    /** Number of top-scored shows from this service */
    showCount: number;
    /** Number of top-scored shows with popularity >= 85 */
    highQualityShowCount: number;
    /** Sum of show scores from this service */
    totalScore: number;
    /** Average score per show */
    avgScore: number;
    /** Value ratio: total score / monthly price */
    valueRatio: number;
    /** Whether user marked this as "always" keep */
    isAlwaysKeep: boolean;
    /** Original status from user preferences */
    originalStatus: string;
    /** Recommended status based on optimization */
    recommendedStatus: "active" | "paused" | "always";
}

/**
 * Result of service optimization
 */
export interface OptimizedServicesResult {
    /** Services with recommended statuses */
    services: ServiceContentValue[];
    /** Shows sorted by score (filtered by optimized active services) */
    shows: Show[];
    /** Total monthly cost of recommended active services */
    totalMonthlyCost: number;
    /** Budget remaining (null if no budget set) */
    budgetRemaining: number | null;
}

/**
 * Optimize which services should be active based on content value and budget.
 *
 * Algorithm:
 * 1. Score all shows regardless of service status
 * 2. Calculate content value per service (how many good shows, avg score)
 * 3. Respect "always" services - they stay active no matter what
 * 4. For remaining budget, add services with best value ratio
 * 5. If a service the user selected has low value, consider swapping for one with better content
 *
 * @param user - User profile with genre preferences
 * @param allServices - All available services (from DEFAULT_SERVICES)
 * @param pool - All shows to analyze
 * @param options - User preferences (signals, release pref, budget, statuses)
 * @param topShowsToConsider - How many top shows to use for calculating service value
 */
export function optimizeServices(
    user: UserProfile,
    allServices: UserService[],
    pool: Show[],
    options: RecommendNextWatchOptions,
    topShowsToConsider = 20
): OptimizedServicesResult {
    const { showSignals, releasePreference, targetBudget, serviceStatuses } = options;

    // Normalize user genres
    const userGenres = user.genres.map((g) => g.toLowerCase());

    // Score ALL shows (ignoring service status for now)
    const scoredShows = pool
        .filter((show) => {
            const signal = showSignals[show.showId];
            return signal !== "seen" && signal !== "skip";
        })
        .map((show) => {
            let score = 0;
            const signal = showSignals[show.showId];

            if (signal === "want") score += 100;

            for (const g of show.genres) {
                if (userGenres.includes(g.toLowerCase())) {
                    score += 10;
                }
            }

            score += show.popularity ?? 0;

            if (releasePreference === "weekly") {
                const currentYear = new Date().getFullYear();
                if (show.year && show.year >= currentYear - 1) {
                    score += 5;
                }
            }

            return { show, score };
        })
        .sort((a, b) => b.score - a.score);

    // Take top N shows to analyze service value
    const topShows = scoredShows.slice(0, topShowsToConsider);

    // Build service value map
    const serviceValueMap = new Map<string, {
        showCount: number;
        totalScore: number;
        highQualityShowCount: number;
        shows: Show[];
    }>();

    for (const { show, score } of topShows) {
        const svcId = show.serviceId;
        const existing = serviceValueMap.get(svcId) || { showCount: 0, totalScore: 0, highQualityShowCount: 0, shows: [] };
        existing.showCount++;
        existing.totalScore += score;
        if ((show.popularity ?? 0) >= 85) existing.highQualityShowCount++;
        existing.shows.push(show);
        serviceValueMap.set(svcId, existing);
    }

    // Build service content value objects
    const serviceContentValues: ServiceContentValue[] = allServices.map((svc) => {
        const value = serviceValueMap.get(svc.serviceId) || { showCount: 0, totalScore: 0, highQualityShowCount: 0, shows: [] };
        const originalStatus = serviceStatuses[svc.serviceId] ?? svc.status;
        const isAlwaysKeep = originalStatus === "always";

        return {
            serviceId: svc.serviceId,
            name: svc.name,
            monthlyPrice: svc.monthlyPrice,
            showCount: value.showCount,
            totalScore: value.totalScore,
            highQualityShowCount: value.highQualityShowCount,
            avgScore: value.showCount > 0 ? value.totalScore / value.showCount : 0,
            valueRatio: svc.monthlyPrice > 0 ? value.totalScore / svc.monthlyPrice : 0,
            isAlwaysKeep,
            originalStatus,
            recommendedStatus: isAlwaysKeep ? "always" : "paused", // Start with paused, we'll activate below
        };
    });

    // Sort by value ratio (best value first)
    serviceContentValues.sort((a, b) => {
        // Always-keep services come first
        if (a.isAlwaysKeep && !b.isAlwaysKeep) return -1;
        if (!a.isAlwaysKeep && b.isAlwaysKeep) return 1;
        // Then by value ratio
        return b.valueRatio - a.valueRatio;
    });

    // Calculate budget used by "always" services
    let budgetUsed = serviceContentValues
        .filter((s) => s.isAlwaysKeep)
        .reduce((sum, s) => sum + s.monthlyPrice, 0);

    const budgetLimit = targetBudget ?? Infinity;

    // Activate services with best value until budget is exhausted
    for (const svc of serviceContentValues) {
        if (svc.isAlwaysKeep) continue; // Already counted

        // Skip services with no content value
        if (svc.showCount === 0) continue;

        // For services the user never explicitly selected, require at least 2 high-quality
        // shows (popularity >= 85) before recommending them
        const isUserSelected = svc.serviceId in serviceStatuses;
        if (!isUserSelected && svc.highQualityShowCount < 2) continue;

        const newTotal = budgetUsed + svc.monthlyPrice;

        if (newTotal <= budgetLimit) {
            svc.recommendedStatus = "active";
            budgetUsed = newTotal;
        } else {
            // Check if we can swap out a lower-value active service
            const activeServices = serviceContentValues.filter(
                (s) => s.recommendedStatus === "active" && !s.isAlwaysKeep
            );

            // Find if swapping makes sense
            for (const active of activeServices) {
                // Would swapping this service for the new one fit in budget and increase value?
                const swapBudget = budgetUsed - active.monthlyPrice + svc.monthlyPrice;
                if (swapBudget <= budgetLimit && svc.valueRatio > active.valueRatio) {
                    // Swap: deactivate old, activate new
                    active.recommendedStatus = "paused";
                    svc.recommendedStatus = "active";
                    budgetUsed = swapBudget;
                    break;
                }
            }
        }
    }

    // Get the set of recommended active service IDs
    const activeServiceIds = new Set(
        serviceContentValues
            .filter((s) => s.recommendedStatus === "active" || s.recommendedStatus === "always")
            .map((s) => s.serviceId)
    );

    // Filter and sort shows by active services first
    const filteredShows = scoredShows
        .filter(({ show }) => activeServiceIds.has(show.serviceId))
        .map(({ show }) => show);

    // Also include shows from non-active services at the end (for discovery)
    const nonActiveShows = scoredShows
        .filter(({ show }) => !activeServiceIds.has(show.serviceId))
        .slice(0, 8) // Limit non-active suggestions
        .map(({ show }) => show);

    return {
        services: serviceContentValues,
        shows: [...filteredShows, ...nonActiveShows],
        totalMonthlyCost: budgetUsed,
        budgetRemaining: targetBudget !== null ? targetBudget - budgetUsed : null,
    };
}

export default { scoreServiceValue, recommendShows, recommendNextWatch, optimizeServices };
