"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Show } from "../../../models/types";
import { DEFAULT_SERVICES } from "../../../data/constants";

// Build a quick lookup for local logic; keep the centralized data authoritative
const SERVICE_CATALOG = DEFAULT_SERVICES.reduce((acc, s) => {
    acc[s.id] = { serviceId: s.serviceId, name: s.name, monthlyPrice: s.monthlyPrice, status: s.status };
    return acc;
}, {} as Record<string, { serviceId: string; name: string; monthlyPrice: number; status: string }>);

// Map genre IDs to display-friendly headlines
const GENRE_HEADLINES: Record<string, string> = {
    action: "The Adrenaline Architect",
    adventure: "The Journey Junkie",
    animation: "The Animation Aficionado",
    comedy: "The Punchline Professional",
    crime: "The Crime-Drama Kingpin",
    documentary: "The Truth Seeker",
    drama: "The Prestige Drama Devotee",
    family: "The Family-Night MVP",
    fantasy: "The Realm Roamer",
    history: "The History Buff Supreme",
    horror: "The Master of Mayhem",
    music: "The Soundtrack Curator",
    mystery: "The Plot-Twist Specialist",
    news: "The Informed Insider",
    reality: "The Reality-TV Ringmaster",
    romance: "The Hopeless Romantic (In the Best Way)",
    scifi: "The Future-World Navigator",
    talk: "The Cultural Conversationalist",
    thriller: "The Suspense Strategist",
    war: "The Battlefield Historian",
    western: "The Modern Gunslinger",
};

/**
 * Fetch recommendations from the API endpoint.
 */
async function fetchRecommendationsFromApi(
    services: string[],
    genres: string[]
): Promise<Show[]> {
    const params = new URLSearchParams({
        services: JSON.stringify(services),
        genres: JSON.stringify(genres),
    });

    const res = await fetch(`/api/shows?${params.toString()}`);

    if (!res.ok) {
        console.debug("fetchRecommendationsFromApi - failed", res.status);
        return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

export default function Onboarding6() {
    const router = useRouter();
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [genres, setGenres] = useState<string[]>([]);
    const [targetBudget, setTargetBudget] = useState<number | null>(null);
    const [recommended, setRecommended] = useState<Show[]>([]);
    const [headline, setHeadline] = useState<string>("Watch with confidence.");
    const [insight, setInsight] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load persisted onboarding values with safe defaults
        try {
            const svcRaw = localStorage.getItem("streamwise_user_services");
            const svc = svcRaw ? (JSON.parse(svcRaw) as string[]) : [];
            const sids = svc.length > 0 ? svc : ["netflix", "max", "hulu", "apple"];
            setSelectedServiceIds(sids);

            const gRaw = localStorage.getItem("streamwise_user_genres");
            const g = gRaw ? (JSON.parse(gRaw) as string[]) : [];
            setGenres(g.length > 0 ? g : ["crime"]);

            const tb = localStorage.getItem("streamwise_user_targetBudget");
            if (tb === null || tb === "null") {
                setTargetBudget(null);
            } else {
                setTargetBudget(Number(tb));
            }
        } catch (e) {
            setSelectedServiceIds(["netflix", "max", "hulu", "apple"]);
            setGenres(["crime"]);
            setTargetBudget(null);
        }
    }, []);

    useEffect(() => {
        // Skip if we haven't loaded preferences yet
        if (selectedServiceIds.length === 0) return;

        async function loadRecommendations() {
            setLoading(true);
            try {
                const recs = await fetchRecommendationsFromApi(selectedServiceIds, genres);
                setRecommended(recs);

                // Persist recommendations for dashboard
                try {
                    localStorage.setItem("streamwise_recommendations", JSON.stringify(recs));
                } catch (e) { /* ignore */ }

                // Headline: pick first genre or fallback to top genre from recs
                const primaryGenre = genres.length ? genres[0] : (() => {
                    const counts: Record<string, number> = {};
                    recs.forEach((r) => r.genres.forEach((g) => counts[g] = (counts[g] || 0) + 1));
                    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
                    return sorted[0] ?? "drama";
                })();

                // Look up headline by genre ID (lowercase)
                const genreKey = primaryGenre.toLowerCase();
                setHeadline(GENRE_HEADLINES[genreKey] ?? "Watch with confidence.");

                // Insight: simple computation from recs by service counts
                const countsByService: Record<string, number> = {};
                recs.forEach((r) => countsByService[r.serviceId] = (countsByService[r.serviceId] || 0) + 1);
                const sortedServices = Object.keys(countsByService).sort((a, b) => countsByService[b] - countsByService[a]);

                if (sortedServices.length >= 2) {
                    const s1 = sortedServices[0];
                    const s2 = sortedServices[1];
                    setInsight(`In the coming weeks, new releases make ${capitalize(s1)} and ${capitalize(s2)} strong picks. We'll let you know when to switch.`);
                } else if (sortedServices.length === 1) {
                    const s1 = sortedServices[0];
                    setInsight(`${capitalize(s1)} looks like the best pick right now.`);
                } else {
                    setInsight("We'll surface the best services based on new releases and your tastes.");
                }
            } catch (e) {
                console.debug("Onboarding6 - error loading recommendations", e);
                setInsight("We'll surface the best services based on new releases and your tastes.");
            } finally {
                setLoading(false);
            }
        }

        loadRecommendations();
    }, [selectedServiceIds, genres, targetBudget]);

    const total = selectedServiceIds.reduce((sum, id) => {
        const s = SERVICE_CATALOG[id];
        return sum + (s ? s.monthlyPrice : 0);
    }, 0);

    const diff = targetBudget === null ? null : Math.round((targetBudget - total) * 100) / 100;

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
            <main className="mx-auto max-w-3xl">
                <header className="text-center text-balance py-12 min-h-48">
                    <h1 className="text-2xl font-semibold dark:text-zinc-50">You're the {headline}</h1>
                    <p className="text-sm text-zinc-400">Based on your tastes and timing preferences, these services give you the most value right now:</p>
                </header>

                <div className="bg-white p-8 rounded shadow">
                    <div className="mb-4">
                        <div className="inline-flex items-center gap-3 flex-wrap">
                            {selectedServiceIds.map((id) => (
                                <span key={id} className="px-3 py-1 bg-zinc-100 rounded-full text-sm">
                                    {SERVICE_CATALOG[id]?.name ?? id}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="text-lg font-medium">You'll spend ${total.toFixed(2)}/month</div>
                        {diff !== null && (
                            <div className="text-sm text-zinc-600">
                                That's ${Math.abs(diff).toFixed(2)} {diff > 0 ? "less" : "more"} than your target.
                            </div>
                        )}
                    </div>

                    <div className="mb-6 p-4 rounded border bg-zinc-50 text-sm">
                        {loading ? (
                            <span className="text-zinc-400">Analyzing your preferences...</span>
                        ) : (
                            insight
                        )}
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="rounded-md bg-zinc-900 text-white px-4 py-2"
                            disabled={loading}
                        >
                            Go to my dashboard
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
