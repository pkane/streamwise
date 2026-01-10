"use client";

import { JSX } from "react";
import React, { useEffect, useState } from "react";
import type { Show } from "../../models/types";
import { DEFAULT_SERVICES } from "../../data/constants";

// Build service catalog from constants for consistent data
const SERVICE_CATALOG = DEFAULT_SERVICES.reduce((acc, s) => {
    acc[s.id] = { serviceId: s.serviceId, name: s.name, monthlyPrice: s.monthlyPrice, status: s.status };
    return acc;
}, {} as Record<string, { serviceId: string; name: string; monthlyPrice: number; status: string }>);

/**
 * Fetch recommendations from the API endpoint.
 * This calls /api/shows which handles the streaming-availability API server-side.
 */
async function fetchRecommendationsFromApi(
    services: string[],
    genres: string[]
): Promise<Show[]> {
    const lsPayload = {
        streamwise_user_services: JSON.stringify(services),
        streamwise_user_genres: JSON.stringify(genres),
    };

    const params = new URLSearchParams({
        services: JSON.stringify(services),
        genres: JSON.stringify(genres),
    });

    const res = await fetch(`/api/shows?${params.toString()}`, {
        headers: { "x-streamwise-localstorage": JSON.stringify(lsPayload) },
    });

    if (!res.ok) {
        console.debug("fetchRecommendationsFromApi - failed", res.status);
        return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

export default function Dashboard(): JSX.Element {
    const [recommended, setRecommended] = useState<Show[]>([]);
    const [services, setServices] = useState<string[]>([]);
    const [genres, setGenres] = useState<string[]>([]);
    const [statuses, setStatuses] = useState<Record<string, string>>({});
    const [targetBudget, setTargetBudget] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function init() {
            try {
                // Load persisted services
                const svcRaw = localStorage.getItem("streamwise_user_services");
                const svc = svcRaw ? JSON.parse(svcRaw) as string[] : [];
                const currentServices = svc.length ? svc : ["netflix", "max"];
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

                // Load budget
                const tb = localStorage.getItem("streamwise_user_targetBudget");
                if (tb === null || tb === "null") {
                    setTargetBudget(null);
                } else {
                    setTargetBudget(Number(tb));
                }

                // Check for cached recommendations
                const cachedRec = localStorage.getItem("streamwise_recommendations");
                if (cachedRec) {
                    setRecommended(JSON.parse(cachedRec));
                    setLoading(false);
                } else {
                    // Fetch fresh recommendations from API
                    setLoading(true);
                    const recs = await fetchRecommendationsFromApi(currentServices, currentGenres);
                    setRecommended(recs);
                    try {
                        localStorage.setItem("streamwise_recommendations", JSON.stringify(recs));
                    } catch (e) { /* ignore storage errors */ }
                    setLoading(false);
                }
            } catch (e) {
                console.debug("Dashboard init error", e);
                setRecommended([]);
                setServices(["netflix", "max"]);
                setGenres(["crime"]);
                setTargetBudget(null);
                setLoading(false);
            }
        }

        init();
    }, []);

    const serviceObjs = services.map(id => {
        const catalog = SERVICE_CATALOG[id] ?? { serviceId: id, name: id, monthlyPrice: 0, status: "paused" };
        const svcId = catalog.serviceId;
        const overridden = statuses[svcId] ?? statuses[id] ?? catalog.status;
        return { ...catalog, status: overridden };
    });

    const handleStatusToggle = async (svc: typeof serviceObjs[0]) => {
        const order = ["active", "paused", "always"] as const;
        const cur = svc.status || "paused";
        const idx = order.indexOf(cur as typeof order[number]);
        const next = order[(idx + 1) % order.length];
        const key = "streamwise_user_service_statuses";

        try {
            const raw = localStorage.getItem(key);
            const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
            map[svc.serviceId] = next;
            localStorage.setItem(key, JSON.stringify(map));
            setStatuses(map);

            // Clear cached recommendations to force refresh
            localStorage.removeItem("streamwise_recommendations");

            // Re-fetch recommendations with updated status
            setLoading(true);
            const recs = await fetchRecommendationsFromApi(services, genres);
            setRecommended(recs);
            try {
                localStorage.setItem("streamwise_recommendations", JSON.stringify(recs));
            } catch (e) { /* ignore */ }
            setLoading(false);
        } catch (e) {
            console.debug("handleStatusToggle error", e);
        }
    };

    return (
        <div className="min-h-screen p-6 bg-zinc-50 text-zinc-900 font-sans dark:bg-black">
            <main className="mx-auto max-w-4xl pb-6">
                <header className="mb-8 py-12">
                    <h1 className="text-3xl font-semibold dark:text-zinc-50">Your Dashboard</h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Selected services: {serviceObjs.map(s => s.name).join(", ")} • Target ${targetBudget ?? "—"}
                    </p>
                </header>

                <section className="mb-8">
                    <h2 className="text-xl font-medium mb-4 dark:text-zinc-50">Your Services</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {serviceObjs.sort((a, b) => {
                            const statusOrder = { active: 0, always: 1, paused: 2 };
                            return (statusOrder[a.status as keyof typeof statusOrder] ?? 3) - (statusOrder[b.status as keyof typeof statusOrder] ?? 3);
                        }).map((svc) => (
                            <div key={svc.serviceId} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">{svc.name}</h3>
                                        <p className="text-sm text-zinc-500">${(svc.monthlyPrice ?? 0).toFixed(2)} / month</p>
                                    </div>
                                    <div className="text-sm font-medium text-zinc-700">
                                        <button
                                            onClick={() => handleStatusToggle(svc)}
                                            className="underline"
                                        >
                                            {svc.status}
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
                            {recommended.map((show) => (
                                <div key={show.showId} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="w-28 shrink-0">
                                            {/* Use img for external URLs from API */}
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
                                            <div className="mt-3 text-sm text-zinc-500 flex items-center justify-between">
                                                <span>{show.serviceId}</span>
                                                {show.popularity && <span>pop {show.popularity}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
