import { NextResponse } from "next/server";
import type { UserService } from "../../../models/types";

// GET /api/services
// Returns mock user services for development. In production this would be
// scoped to the authenticated user and stored in a DB.
export async function GET() {
    const example: UserService[] = [
        { serviceId: "svc_netflix", name: "Netflix", monthlyPrice: 15.49, status: "active", relevanceScore: 0.9, valueReason: "Great crime catalog" },
        { serviceId: "svc_max", name: "Max", monthlyPrice: 9.99, status: "paused", relevanceScore: 0.7 },
        { serviceId: "svc_hulu", name: "Hulu", monthlyPrice: 7.99, status: "always", relevanceScore: 0.5 },
        { serviceId: "svc_apple", name: "Apple TV+", monthlyPrice: 4.99, status: "paused" },
    ];

    return NextResponse.json(example);
}

// TODO: Add POST/PATCH endpoints to manage service subscriptions
