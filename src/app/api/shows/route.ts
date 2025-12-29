import { NextResponse } from "next/server";
import type { UserProfile } from "../../../models/types";
import { fetchShowsForUser } from "../../../lib/content";
import { recommendShows } from "../../../lib/recommendations";
import type { UserService } from "../../../models/types";

// GET /api/shows
// Returns recommended shows for the (mock) user. In future this will accept
// auth and query params to scope and paginate results.
export async function GET() {
    // Mock user profile; in production derive from auth/session
    const user: UserProfile = {
        id: "user_1",
        name: "Alex",
        targetBudget: 25,
        genres: ["Crime", "Drama"],
        bingeTolerance: 3,
    };

    // Fetch user's services (could be replaced with DB call or auth-scoped endpoint)
    // For now use the services stubbed in /api/services route by duplicating list here
    const services: UserService[] = [
        { serviceId: "svc_netflix", name: "Netflix", monthlyPrice: 15.49, status: "active", relevanceScore: 0.9 },
        { serviceId: "svc_max", name: "Max", monthlyPrice: 9.99, status: "paused", relevanceScore: 0.7 },
        { serviceId: "svc_hulu", name: "Hulu", monthlyPrice: 7.99, status: "always", relevanceScore: 0.5 },
        { serviceId: "svc_apple", name: "Apple TV+", monthlyPrice: 4.99, status: "paused" },
    ];

    const pool = await fetchShowsForUser(user);
    const recommended = recommendShows(user, services, pool, 8);

    return NextResponse.json(recommended);
}
