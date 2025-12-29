import { NextResponse } from "next/server";

// GET /api/health
// Simple healthcheck route used by monitoring and local development.
export async function GET() {
    return NextResponse.json({ status: "ok" });
}

// TODO: Add extended health details (db, cache) when integrations are available.
