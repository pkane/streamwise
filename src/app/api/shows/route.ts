import { NextResponse, NextRequest } from "next/server";
import type { UserProfile, UserService, Show } from "../../../models/types";
import { recommendShows, optimizeServices } from "../../../lib/recommendations";
import type { RecommendNextWatchOptions, ShowSignal } from "../../../lib/recommendations";
import { searchShowsByFilters } from "../../../lib/content/streamingAvailability";
import { enrichShowsWithTmdbData } from "../../../lib/content/tmdb";
import { DEFAULT_SERVICES, GENRES } from "../../../data/constants";
// import { mockShows } from "../../../data/mockShows";

// GET /api/shows
// Returns recommended shows for the user based on their preferences.
export async function GET(req: NextRequest) {
    const qp = req.nextUrl.searchParams;

    // Parse localStorage values from header (client can't access localStorage server-side)
    const lsHeader = req.headers.get("x-streamwise-localstorage") ?? "";
    let localStorageValues: Record<string, string> = {};
    try {
        localStorageValues = lsHeader ? JSON.parse(lsHeader) : {};
    } catch {
        localStorageValues = {};
    }

    const rawServices = qp.get("services") ?? localStorageValues["streamwise_user_services"] ?? "";
    const rawGenres = qp.get("genres") ?? localStorageValues["streamwise_user_genres"] ?? "";
    const rawBudget = qp.get("targetBudget") ?? localStorageValues["streamwise_user_targetBudget"] ?? null;
    const rawName = qp.get("name") ?? localStorageValues["streamwise_user_name"] ?? "You";

    // Additional params for recommendNextWatch
    const rawShowSignals = qp.get("showSignals") ?? localStorageValues["streamwise_user_showSignals"] ?? "";
    const rawReleasePreference = qp.get("releasePreference") ?? localStorageValues["streamwise_user_releasePreference"] ?? "mixed";
    const rawServiceStatuses = qp.get("serviceStatuses") ?? localStorageValues["streamwise_user_service_statuses"] ?? "";
    const useNextWatch = qp.get("useNextWatch") === "true";

    function parseList(raw: string): string[] {
        if (!raw) return [];
        try {
            if (raw.trim().startsWith("[")) return JSON.parse(raw) as string[];
            return raw.split(",").map((s) => s.trim()).filter(Boolean);
        } catch {
            return raw.split(",").map((s) => s.trim()).filter(Boolean);
        }
    }

    const servicesSelected = parseList(rawServices);
    const genresSelected = parseList(rawGenres).length ? parseList(rawGenres) : ["crime"];
    const targetBudget = rawBudget === null || rawBudget === "null" ? null : rawBudget ? Number(rawBudget) : 0;

    // Build user profile
    const user: UserProfile = {
        id: localStorageValues["streamwise_user_id"] ?? qp.get("id") ?? "anon",
        name: rawName,
        targetBudget: targetBudget,
        genres: genresSelected,
        bingeTolerance: 3,
        services: []
    };

    // Filter services based on user selection
    const services: UserService[] = DEFAULT_SERVICES
        .filter((s) => servicesSelected.length === 0 || servicesSelected.includes(s.id))
        .map((s) => ({
            serviceId: s.serviceId,
            name: s.name,
            monthlyPrice: s.monthlyPrice,
            status: s.status as "active" | "paused" | "always"
        }));

    // Normalize genres to API ids
    const genreIds = user.genres.map((val) => {
        const asStr = String(val).toLowerCase();
        const byId = GENRES.find((g) => g.id === asStr);
        if (byId) return byId.id;
        const byName = GENRES.find((g) => g.name.toLowerCase() === asStr);
        if (byName) return byName.id;
        return asStr.replace(/[^a-z0-9]+/g, "");
    });

    // Update user genres to normalized ids
    user.genres = genreIds;

    // Build catalogs array for the API
    // Search across ALL default services to get a broader pool, then let recommendation engine prioritize
    const allServiceIds = DEFAULT_SERVICES.map((s) => s.serviceId);
    const userServiceIds = services.map((s) => s.serviceId);

    // Fetch shows from streaming-availability API
    const TARGET_POOL = 48;
    let pool: Show[] = [];
    try {
        // Paginated fetch for user's selected services (up to TARGET_POOL results)
        pool = await searchShowsByFilters(
            userServiceIds,
            genreIds,
            "us",
            "series",
            TARGET_POOL
        );
        console.debug("/api/shows - paginated fetch from user services", { count: pool.length });

        // If the pool is still thin (< 24), broaden to all services for one extra page
        if (pool.length < 24) {
            const additionalPool = await searchShowsByFilters(
                allServiceIds,
                genreIds,
                "us",
                "series",
                TARGET_POOL
            );
            console.debug("/api/shows - broadened to all services", { count: additionalPool.length });

            // Merge and dedupe by showId
            const existingIds = new Set(pool.map((s) => s.showId));
            for (const show of additionalPool) {
                if (!existingIds.has(show.showId)) {
                    pool.push(show);
                    existingIds.add(show.showId);
                }
            }
            console.debug("/api/shows - merged pool", { count: pool.length });
        }
    } catch (e) {
        console.debug("/api/shows - API call failed", e);
    }

    // Fallback to mock data if API returns nothing
    // if (pool.length === 0) {
    //     const genresLower = genreIds.map((g) => g.toLowerCase());
    //     pool = mockShows.filter((s) => {
    //         const hasMatchingGenre = s.genres.some((g) =>
    //             genresLower.includes(g.toLowerCase())
    //         );
    //         if (!hasMatchingGenre) return false;
    //         if (servicesSelected.length > 0) {
    //             const svcId = s.serviceId.replace("svc_", "");
    //             return servicesSelected.includes(svcId) || servicesSelected.includes(s.serviceId);
    //         }
    //         return true;
    //     });
    // }

    // Enrich pool with TMDB next-episode data for upcoming season badges
    if (pool.length > 0) {
        try {
            pool = await enrichShowsWithTmdbData(pool);
        } catch (e) {
            console.debug("/api/shows - TMDB enrichment failed", e);
        }
    }

    // Parse additional options
    let showSignals: Record<string, ShowSignal> = {};
    try {
        if (rawShowSignals) {
            const parsed = rawShowSignals.trim().startsWith("{")
                ? JSON.parse(rawShowSignals)
                : {};
            showSignals = parsed as Record<string, ShowSignal>;
        }
    } catch {
        showSignals = {};
    }

    let serviceStatuses: Record<string, string> = {};
    try {
        if (rawServiceStatuses) {
            serviceStatuses = rawServiceStatuses.trim().startsWith("{")
                ? JSON.parse(rawServiceStatuses)
                : {};
        }
    } catch {
        serviceStatuses = {};
    }

    const releasePreference = (["weekly", "binge", "mixed"].includes(rawReleasePreference)
        ? rawReleasePreference
        : "mixed") as "weekly" | "binge" | "mixed";

    const options: RecommendNextWatchOptions = {
        showSignals,
        releasePreference,
        targetBudget: targetBudget,
        serviceStatuses,
    };

    // Build all services list for optimization
    const allServices: UserService[] = DEFAULT_SERVICES.map((s) => ({
        serviceId: s.serviceId,
        name: s.name,
        monthlyPrice: s.monthlyPrice,
        status: (serviceStatuses[s.serviceId] ?? s.status) as "active" | "paused" | "always"
    }));

    if (useNextWatch) {
        // Use optimizeServices to get both optimized service recommendations and shows
        const result = optimizeServices(user, allServices, pool, options, 40);

        // Return the full result with optimized services
        return NextResponse.json({
            shows: result.shows.slice(0, 48),
            services: result.services,
            totalMonthlyCost: result.totalMonthlyCost,
            budgetRemaining: result.budgetRemaining,
        });
    } else {
        const recommended = recommendShows(user, services, pool, 16);
        return NextResponse.json(recommended);
    }
}
