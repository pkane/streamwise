import { NextResponse } from "next/server";
import { DEFAULT_SERVICES } from "../../../../src/data/constants";

// GET /api/services
// Returns mock user services for development. In production this would be
// scoped to the authenticated user and stored in a DB.
export async function GET() {
    const services = DEFAULT_SERVICES;

    return NextResponse.json(services);
}

// TODO: Add POST/PATCH endpoints to manage service subscriptions
