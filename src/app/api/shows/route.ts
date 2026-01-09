import { NextResponse, NextRequest } from "next/server";
import type { UserProfile } from "../../../models/types";
import { recommendShows } from "../../../lib/recommendations";
import { searchShowsByFilters } from "../../../lib/content/streamingAvailability";
import { DEFAULT_SERVICES, GENRES } from "../../../data/constants";
import type { UserService } from "../../../models/types";

// GET /api/shows
// Returns recommended shows for the (mock) user. In future this will accept
// auth and query params to scope and paginate results.
export async function GET(req: NextRequest) {
    // Try to derive user profile from query params or a client-sent localStorage JSON header.
    const qp = req.nextUrl.searchParams;

    const lsHeader = req.headers.get("x-streamwise-localstorage") ?? "";
    let localStorageValues: Record<string, string> = {};
    try {
        localStorageValues = lsHeader ? JSON.parse(lsHeader) : {};
    } catch (e) {
        localStorageValues = {};
    }

    const rawServices = qp.get("services") ?? localStorageValues["streamwise_user_services"] ?? "";
    const rawGenres = qp.get("genres") ?? localStorageValues["streamwise_user_genres"] ?? "";
    const rawBudget = qp.get("targetBudget") ?? localStorageValues["streamwise_user_targetBudget"] ?? null;
    const rawName = qp.get("name") ?? localStorageValues["streamwise_user_name"] ?? "You";

    function parseList(raw: string) {
        if (!raw) return [] as string[];
        try {
            if (raw.trim().startsWith("[")) return JSON.parse(raw) as string[];
            return raw.split(",").map((s) => s.trim()).filter(Boolean);
        } catch (e) {
            return raw.split(",").map((s) => s.trim()).filter(Boolean);
        }
    }

    const servicesSelected = parseList(rawServices);
    const genresSelected = parseList(rawGenres).length ? parseList(rawGenres) : ["Crime"];
    const targetBudget = rawBudget === null || rawBudget === "null" ? null : rawBudget ? Number(rawBudget) : 0;

    const user: UserProfile = {
        id: localStorageValues["streamwise_user_id"] ?? qp.get("id") ?? "anon",
        name: rawName,
        targetBudget: targetBudget,
        genres: genresSelected,
        bingeTolerance: 3,
        services: []
    };

    // Use onboarding default services as the canonical set to filter/match against
    const services: UserService[] = (DEFAULT_SERVICES as any)
        .filter((s: any) => servicesSelected.length ? servicesSelected.includes(s.id) : true)
        .map((s: any) => ({ serviceId: s.serviceId, name: s.name, monthlyPrice: s.monthlyPrice, status: s.status }));

    // Ensure genres are mapped to API ids (support display names or ids)
    const genreIds = (user.genres && user.genres.length ? user.genres : ["Crime"]).map((val) => {
        const asStr = String(val);
        const byId = GENRES.find((g: any) => g.id === asStr.toLowerCase());
        if (byId) return byId.id;
        const byName = GENRES.find((g: any) => g.name.toLowerCase() === asStr.toLowerCase());
        if (byName) return byName.id;
        return asStr.toLowerCase().replace(/[^a-z0-9]+/g, "");
    });

    // Fetch available shows from Streaming Availability (RapidAPI) for the user's genres
    let pool = [];
    try {
        pool = await searchShowsByFilters(services.map(service => service.serviceId), genreIds, "us", "series");
        // update user.genres to canonical ids for recommendation logic
        user.genres = genreIds;
    } catch (e) {
        // If external API fails, fall back to an empty pool — recommendShows should handle gracefully.
        pool = [] as any[];
    }

    const recommended = recommendShows(user, services as any, pool as any, 8);

    return NextResponse.json(recommended);
}
