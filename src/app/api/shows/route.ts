import { NextResponse, NextRequest } from "next/server";
import type { UserProfile, UserService, Show } from "../../../models/types";
import { recommendShows } from "../../../lib/recommendations";
import { searchShowsByFilters } from "../../../lib/content/streamingAvailability";
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

    // Fetch shows from streaming-availability API
    let pool: Show[] = [];
    try {
        pool = await searchShowsByFilters(
            services.map((s) => s.serviceId),
            genreIds,
            "us",
            "series"
        );
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

    const recommended = recommendShows(user, services, pool, 8);

    return NextResponse.json(recommended);
}
