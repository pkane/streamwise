"use client";

import { JSX } from "react";
import { useEffect, useState } from "react";
import type { Show } from "../../models/types";
import { DEFAULT_SERVICES } from "../../data/constants";

// Build service catalog from constants for consistent data
const SERVICE_CATALOG = DEFAULT_SERVICES.reduce((acc, s) => {
    acc[s.id] = { serviceId: s.serviceId, name: s.name, monthlyPrice: s.monthlyPrice, status: s.status };
    return acc;
}, {} as Record<string, { serviceId: string; name: string; monthlyPrice: number; status: string }>);

/** Optimized service from API */
interface OptimizedService {
    serviceId: string;
    name: string;
    monthlyPrice: number;
    showCount: number;
    totalScore: number;
    avgScore: number;
    valueRatio: number;
    isAlwaysKeep: boolean;
    originalStatus: string;
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
 * Returns both shows and optimized service recommendations.
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

export default function Dashboard(): JSX.Element {
    const [recommended, setRecommended] = useState<Show[]>([]);
    const [optimizedServices, setOptimizedServices] = useState<OptimizedService[]>([]);
    const [services, setServices] = useState<string[]>([]);
    const [genres, setGenres] = useState<string[]>([]);
    const [statuses, setStatuses] = useState<Record<string, string>>({});
    const [showSignals, setShowSignals] = useState<Record<string, string>>({});
    const [releasePreference, setReleasePreference] = useState<string>("mixed");
    const [targetBudget, setTargetBudget] = useState<number | null>(null);
    const [totalMonthlyCost, setTotalMonthlyCost] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Helper to load and fetch data
    const loadData = async (
        currentServices: string[],
        currentGenres: string[],
        currentSignals: Record<string, string>,
        currentReleasePref: string,
        currentBudget: number | null,
        currentStatuses: Record<string, string>
    ) => {
        setLoading(true);
        const result = await fetchOptimizedRecommendations(
            currentServices,
            currentGenres,
            currentSignals,
            currentReleasePref,
            currentBudget,
            currentStatuses
        );
        if (result) {
            setRecommended(result.shows);
            setOptimizedServices(result.services);
            setTotalMonthlyCost(result.totalMonthlyCost);
            try {
                localStorage.setItem("streamwise_recommendations", JSON.stringify(result.shows));
                localStorage.setItem("streamwise_optimized_services", JSON.stringify(result.services));
            } catch { /* ignore */ }
        }
        setLoading(false);
    };

    useEffect(() => {
        async function init() {
            try {
                // Load persisted services
                const svcRaw = localStorage.getItem("streamwise_user_services");
                const svc = svcRaw ? JSON.parse(svcRaw) as string[] : [];
                const currentServices = svc.length ? svc : ["netflix", "hbo"];
                setServices(currentServices);

                // Load persisted genres
                const genreRaw = localStorage.getItem("streamwise_user_genres");
                const userGenres = genreRaw ? JSON.parse(genreRaw) as string[] : [];
                const currentGenres = userGenres.length ? userGenres : ["crime"];
                setGenres(currentGenres);

                // Load service statuses
                const statusKey = "streamwise_user_service_statuses";
                const statusRaw = localStorage.getItem(statusKey);
                const statusMap = statusRaw ? (JSON.parse(statusRaw) as Record<string, string>) : {};
                setStatuses(statusMap);

                // Load show signals
                const signalsRaw = localStorage.getItem("streamwise_user_showSignals");
                const signals = signalsRaw ? JSON.parse(signalsRaw) as Record<string, string> : {};
                setShowSignals(signals);

                // Load release preference
                const relPref = localStorage.getItem("streamwise_user_releasePreference") ?? "mixed";
                setReleasePreference(relPref);

                // Load budget
                const tb = localStorage.getItem("streamwise_user_targetBudget");
                let currentBudget: number | null = null;
                if (tb !== null && tb !== "null") {
                    currentBudget = Number(tb);
                }
                setTargetBudget(currentBudget);

                // Check for cached data
                const cachedRec = localStorage.getItem("streamwise_recommendations");
                const cachedServices = localStorage.getItem("streamwise_optimized_services");
                if (cachedRec && cachedServices) {
                    const parsedServices = JSON.parse(cachedServices) as OptimizedService[];
                    setRecommended(JSON.parse(cachedRec));
                    setOptimizedServices(parsedServices);
                    const cachedCost = parsedServices
                        .filter((s) => s.recommendedStatus === "active" || s.recommendedStatus === "always")
                        .reduce((sum, s) => sum + s.monthlyPrice, 0);
                    setTotalMonthlyCost(cachedCost);
                    setLoading(false);
                } else {
                    // Fetch fresh recommendations from API
                    await loadData(currentServices, currentGenres, signals, relPref, currentBudget, statusMap);
                }
            } catch (e) {
                console.debug("Dashboard init error", e);
                setRecommended([]);
                setOptimizedServices([]);
                setServices(["netflix", "hbo"]);
                setGenres(["crime"]);
                setTargetBudget(null);
                setLoading(false);
            }
        }

        init();
    }, []);

    // Get active services from optimized recommendations
    const activeOptimizedServices = optimizedServices.filter(
        (s) => s.recommendedStatus === "active" || s.recommendedStatus === "always"
    );

    // Compute active service IDs for show display
    const activeServiceIds = new Set(activeOptimizedServices.map((s) => s.serviceId));

    const handleStatusToggle = async (svc: OptimizedService) => {
        // Cycle through statuses: active -> paused -> always -> active
        const order = ["active", "paused", "always"] as const;
        const cur = svc.recommendedStatus || "paused";
        const idx = order.indexOf(cur);
        const next = order[(idx + 1) % order.length];

        // Update local statuses
        const newStatuses = { ...statuses, [svc.serviceId]: next };
        setStatuses(newStatuses);
        localStorage.setItem("streamwise_user_service_statuses", JSON.stringify(newStatuses));

        // Clear cache and refetch
        localStorage.removeItem("streamwise_recommendations");
        localStorage.removeItem("streamwise_optimized_services");

        await loadData(services, genres, showSignals, releasePreference, targetBudget, newStatuses);
    };

    return (
        <div className="min-h-screen p-6 bg-zinc-50 text-zinc-900 font-sans dark:bg-black">
            <main className="mx-auto max-w-4xl pb-6">
                <header className="mb-8 py-12">
                    <h1 className="text-3xl font-semibold dark:text-zinc-50">Your Dashboard</h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        {activeOptimizedServices.length > 0
                            ? `Recommended: ${activeOptimizedServices.map((s) => s.name).join(", ")}`
                            : `Selected services: ${services.join(", ")}`}
                        {" "} • ${totalMonthlyCost.toFixed(2)}/mo
                        {targetBudget !== null && (
                            <span className={totalMonthlyCost <= targetBudget ? "text-green-600" : "text-amber-600"}>
                                {" "}({totalMonthlyCost <= targetBudget ? "under" : "over"} ${targetBudget} target)
                            </span>
                        )}
                    </p>
                </header>

                <section className="mb-8">
                    <h2 className="text-xl font-medium mb-4 dark:text-zinc-50">Recommended Services</h2>
                    <p className="text-sm text-zinc-500 mb-4 dark:text-zinc-400">
                        Based on your taste and budget, these services offer the best value. Toggle status to adjust.
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {activeOptimizedServices
                            .sort((a, b) => {
                                const statusOrder = { always: 0, active: 1 };
                                return (statusOrder[a.recommendedStatus as keyof typeof statusOrder] ?? 2) -
                                       (statusOrder[b.recommendedStatus as keyof typeof statusOrder] ?? 2);
                            })
                            .map((svc) => (
                                <div key={svc.serviceId} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold">{svc.name}</h3>
                                            <p className="text-sm text-zinc-500">${svc.monthlyPrice.toFixed(2)} / month</p>
                                            <p className="text-xs text-zinc-400">{svc.showCount} shows for you</p>
                                        </div>
                                        <div className="text-sm font-medium text-zinc-700">
                                            <button
                                                onClick={() => handleStatusToggle(svc)}
                                                className="underline"
                                            >
                                                {svc.recommendedStatus}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-4 dark:text-zinc-50">What to Watch</h2>
                    {loading ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={`loading-${i}`} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm animate-pulse">
                                    <div className="flex items-start gap-4">
                                        <div className="w-28 h-42 bg-zinc-200 rounded shrink-0" />
                                        <div className="flex-1">
                                            <div className="h-5 bg-zinc-200 w-3/4 mb-2 rounded" />
                                            <div className="h-4 bg-zinc-200 w-1/2 mb-2 rounded" />
                                            <div className="h-3 bg-zinc-200 w-full mb-1 rounded" />
                                            <div className="h-3 bg-zinc-200 w-2/3 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : recommended.length === 0 ? (
                        <p className="text-zinc-500">No recommendations found. Try adjusting your genre preferences.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {recommended.map((show) => {
                                const isFromActiveService = activeServiceIds.has(show.serviceId);
                                const serviceName = SERVICE_CATALOG[show.serviceId]?.name ?? show.serviceId;
                                return (
                                    <div
                                        key={show.showId}
                                        className={`rounded-lg border bg-white p-4 shadow-sm ${
                                            isFromActiveService ? "border-zinc-200" : "border-dashed border-zinc-300 opacity-80"
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-28 shrink-0">
                                                <img
                                                    src={show.imageSet?.verticalPoster?.w360 ?? "/vertical-poster.svg"}
                                                    width={112}
                                                    height={168}
                                                    alt={`${show.title} poster`}
                                                    className="rounded-sm object-cover w-full"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold">{show.title}</h3>
                                                <p className="text-sm text-zinc-500">{show.year} • {show.genres.join(", ")}</p>
                                                <p className="mt-2 text-sm text-zinc-600 line-clamp-3">{show.overview ?? "No overview available."}</p>
                                                {show.actors && show.actors.length > 0 && (
                                                    <p className="mt-2 text-sm text-zinc-500">Starring: {show.actors.slice(0, 2).join(", ")}</p>
                                                )}
                                                <div className="mt-3 text-sm flex items-center justify-between">
                                                    <span className={isFromActiveService ? "text-zinc-700 font-medium" : "text-zinc-400"}>
                                                        {serviceName}
                                                        {!isFromActiveService && " (not active)"}
                                                    </span>
                                                    {show.popularity && <span className="text-zinc-400">pop {show.popularity}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
