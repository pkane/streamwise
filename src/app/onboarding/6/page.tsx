"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Show } from "../../../models/types";

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

/** Optimized service from API */
interface OptimizedService {
    serviceId: string;
    name: string;
    monthlyPrice: number;
    showCount: number;
    recommendedStatus: "active" | "paused" | "always";
}

/** Full API response with optimized services */
interface OptimizedResponse {
    shows: Show[];
    services: OptimizedService[];
    totalMonthlyCost: number;
    budgetRemaining: number | null;
}

/**
 * Fetch optimized recommendations from the API endpoint.
 */
async function fetchOptimizedRecommendations(
    services: string[],
    genres: string[],
    showSignals: Record<string, string>,
    releasePreference: string,
    targetBudget: number | null,
    serviceStatuses: Record<string, string>
): Promise<OptimizedResponse | null> {
    const params = new URLSearchParams({
        services: JSON.stringify(services),
        genres: JSON.stringify(genres),
        showSignals: JSON.stringify(showSignals),
        releasePreference,
        targetBudget: targetBudget !== null ? String(targetBudget) : "null",
        serviceStatuses: JSON.stringify(serviceStatuses),
        useNextWatch: "true",
    });

    const res = await fetch(`/api/shows?${params.toString()}`);

    if (!res.ok) {
        console.debug("fetchOptimizedRecommendations - failed", res.status);
        return null;
    }

    const data = await res.json();

    // Handle both old array format and new object format
    if (Array.isArray(data)) {
        return { shows: data, services: [], totalMonthlyCost: 0, budgetRemaining: null };
    }

    return data as OptimizedResponse;
}

export default function Onboarding6() {
    const router = useRouter();
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [genres, setGenres] = useState<string[]>([]);
    const [targetBudget, setTargetBudget] = useState<number | null>(null);
    const [showSignals, setShowSignals] = useState<Record<string, string>>({});
    const [releasePreference, setReleasePreference] = useState<string>("mixed");
    const [serviceStatuses, setServiceStatuses] = useState<Record<string, string>>({});
    const [recommended, setRecommended] = useState<Show[]>([]);
    const [optimizedServices, setOptimizedServices] = useState<OptimizedService[]>([]);
    const [totalMonthlyCost, setTotalMonthlyCost] = useState<number>(0);
    const [headline, setHeadline] = useState<string>("Watch with confidence.");
    const [insight, setInsight] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load persisted onboarding values with safe defaults
        try {
            const svcRaw = localStorage.getItem("streamwise_user_services");
            const svc = svcRaw ? (JSON.parse(svcRaw) as string[]) : [];
            const sids = svc.length > 0 ? svc : ["netflix", "hbo", "hulu", "apple"];
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

            // Load show signals from step 3b
            const signalsRaw = localStorage.getItem("streamwise_user_showSignals");
            if (signalsRaw) {
                setShowSignals(JSON.parse(signalsRaw) as Record<string, string>);
            }

            // Load release preference from step 4
            const relPref = localStorage.getItem("streamwise_user_releasePreference");
            if (relPref) {
                setReleasePreference(relPref);
            }

            // Load service statuses
            const statusesRaw = localStorage.getItem("streamwise_user_service_statuses");
            if (statusesRaw) {
                setServiceStatuses(JSON.parse(statusesRaw) as Record<string, string>);
            }
        } catch {
            setSelectedServiceIds(["netflix", "hbo", "hulu", "apple"]);
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
                const result = await fetchOptimizedRecommendations(
                    selectedServiceIds,
                    genres,
                    showSignals,
                    releasePreference,
                    targetBudget,
                    serviceStatuses
                );

                if (result) {
                    setRecommended(result.shows);
                    setOptimizedServices(result.services);
                    setTotalMonthlyCost(result.totalMonthlyCost);

                    // Persist for dashboard
                    try {
                        localStorage.setItem("streamwise_recommendations", JSON.stringify(result.shows));
                        localStorage.setItem("streamwise_optimized_services", JSON.stringify(result.services));
                    } catch { /* ignore */ }

                    // Build insight from optimized services
                    const activeServices = result.services.filter(
                        (s) => s.recommendedStatus === "active" || s.recommendedStatus === "always"
                    );

                    if (activeServices.length >= 2) {
                        const names = activeServices.slice(0, 2).map((s) => s.name);
                        setInsight(`Based on your tastes, ${names[0]} and ${names[1]} offer the best value. We found ${result.shows.length} shows you'll love.`);
                    } else if (activeServices.length === 1) {
                        setInsight(`${activeServices[0].name} is your best pick right now with ${activeServices[0].showCount} great shows for you.`);
                    } else {
                        setInsight("We'll surface the best services based on new releases and your tastes.");
                    }
                }

                // Headline: pick first genre
                const primaryGenre = genres.length ? genres[0] : "drama";
                const genreKey = primaryGenre.toLowerCase();
                setHeadline(GENRE_HEADLINES[genreKey] ?? "Watch with confidence.");

            } catch (e) {
                console.debug("Onboarding6 - error loading recommendations", e);
                setInsight("We'll surface the best services based on new releases and your tastes.");
            } finally {
                setLoading(false);
            }
        }

        loadRecommendations();
    }, [selectedServiceIds, genres, targetBudget, showSignals, releasePreference, serviceStatuses]);

    // Get active optimized services
    const activeServices = optimizedServices.filter(
        (s) => s.recommendedStatus === "active" || s.recommendedStatus === "always"
    );

    const budgetDiff = targetBudget !== null ? targetBudget - totalMonthlyCost : null;

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
            <main className="mx-auto max-w-3xl">
                <header className="text-center text-balance py-12 min-h-48">
                    <h1 className="text-2xl font-semibold dark:text-zinc-50">You are the {headline}</h1>
                    <p className="text-sm text-zinc-400">Based on your tastes and budget, we recommend these services:</p>
                </header>

                <div className="bg-white p-8 rounded shadow">
                    <div className="mb-4">
                        <p className="text-sm text-zinc-500 mb-2">Recommended services:</p>
                        <div className="inline-flex items-center gap-3 flex-wrap">
                            {activeServices.length > 0 ? (
                                activeServices.map((svc) => (
                                    <span key={svc.serviceId} className="px-3 py-1 bg-zinc-100 rounded-full text-sm">
                                        {svc.name}
                                        <span className="text-zinc-400 ml-1">({svc.showCount} shows)</span>
                                    </span>
                                ))
                            ) : (
                                selectedServiceIds.map((id) => (
                                    <span key={id} className="px-3 py-1 bg-zinc-100 rounded-full text-sm">
                                        {id}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="text-lg font-medium">
                            You will spend ${totalMonthlyCost.toFixed(2)}/month
                        </div>
                        {budgetDiff !== null && (
                            <div className={`text-sm ${budgetDiff >= 0 ? "text-green-600" : "text-amber-600"}`}>
                                {budgetDiff >= 0
                                    ? `$${budgetDiff.toFixed(2)} under your $${targetBudget} target`
                                    : `$${Math.abs(budgetDiff).toFixed(2)} over your $${targetBudget} target`}
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

                    {/* Teaser: Show 3 thumbnails of upcoming recommendations */}
                    {!loading && recommended.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-zinc-200">
                            <p className="text-sm text-zinc-500 mb-3">A taste of what awaits you:</p>
                            <div className="flex gap-3 justify-center">
                                {recommended.slice(0, 3).map((show) => (
                                    <div key={show.showId} className="w-20 group relative">
                                        <img
                                            src={show.imageSet?.verticalPoster?.w360 ?? "/vertical-poster.svg"}
                                            width={80}
                                            height={120}
                                            alt={show.title}
                                            className="rounded-sm object-cover w-full shadow-sm"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm flex items-end p-1">
                                            <span className="text-white text-xs font-medium line-clamp-2">{show.title}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end mt-6">
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
