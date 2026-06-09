"use client";

import { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Show } from "../../models/types";
import { DEFAULT_SERVICES, GENRE_HEADLINES } from "../../data/constants";
import { getSeasonLabel } from "../../lib/seasonUtils";
import { motion, AnimatePresence, fadeInUp, staggerContainer, staggerItem } from "../../components/motion";

const CACHE_VERSION = "v3";
const PAGE_SIZE = 8;
const MAX_PAGES = 6;

const SERVICE_CATALOG = DEFAULT_SERVICES.reduce((acc, s) => {
    acc[s.id] = { serviceId: s.serviceId, name: s.name, monthlyPrice: s.monthlyPrice, status: s.status };
    return acc;
}, {} as Record<string, { serviceId: string; name: string; monthlyPrice: number; status: string }>);

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

interface OptimizedResponse {
    shows: Show[];
    services: OptimizedService[];
    totalMonthlyCost: number;
    budgetRemaining: number | null;
}

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
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) return { shows: data, services: [], totalMonthlyCost: 0, budgetRemaining: null };
    return data as OptimizedResponse;
}

function ThumbsUp({ filled }: { filled?: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
    );
}

function ThumbsDown({ filled }: { filled?: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z" />
            <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
    );
}

export default function Dashboard(): JSX.Element {
    const router = useRouter();
    const [recommended, setRecommended] = useState<Show[]>([]);
    const [optimizedServices, setOptimizedServices] = useState<OptimizedService[]>([]);
    const [services, setServices] = useState<string[]>([]);
    const [targetBudget, setTargetBudget] = useState<number | null>(null);
    const [totalMonthlyCost, setTotalMonthlyCost] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [confirmed, setConfirmed] = useState(false);
    const [sortOrder, setSortOrder] = useState<"recommended" | "popularity" | "az">("recommended");
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const [headline, setHeadline] = useState<string>("");
    const [pendingDismiss, setPendingDismiss] = useState<Show | null>(null);
    const [showRatings, setShowRatings] = useState<Record<string, "up" | "down">>({});

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
            currentServices, currentGenres, currentSignals,
            currentReleasePref, currentBudget, currentStatuses
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
                const svcRaw = localStorage.getItem("streamwise_user_services");
                const svc = svcRaw ? JSON.parse(svcRaw) as string[] : [];
                const currentServices = svc.length ? svc : ["netflix", "hbo"];
                setServices(currentServices);

                const genreRaw = localStorage.getItem("streamwise_user_genres");
                const userGenres = genreRaw ? JSON.parse(genreRaw) as string[] : [];
                const currentGenres = userGenres.length ? userGenres : ["crime"];

                // Derive headline from primary genre
                const primaryGenre = currentGenres[0]?.toLowerCase() ?? "drama";
                setHeadline(GENRE_HEADLINES[primaryGenre] ?? "");

                const statusRaw = localStorage.getItem("streamwise_user_service_statuses");
                const statusMap = statusRaw ? (JSON.parse(statusRaw) as Record<string, string>) : {};

                const signalsRaw = localStorage.getItem("streamwise_user_showSignals");
                const signals = signalsRaw ? JSON.parse(signalsRaw) as Record<string, string> : {};

                const relPref = localStorage.getItem("streamwise_user_releasePreference") ?? "mixed";

                const tb = localStorage.getItem("streamwise_user_targetBudget");
                let currentBudget: number | null = null;
                if (tb !== null && tb !== "null") currentBudget = Number(tb);
                setTargetBudget(currentBudget);

                // Load persisted ratings
                const ratingsRaw = localStorage.getItem("streamwise_show_ratings");
                if (ratingsRaw) setShowRatings(JSON.parse(ratingsRaw) as Record<string, "up" | "down">);

                if (localStorage.getItem("streamwise_cache_version") !== CACHE_VERSION) {
                    localStorage.removeItem("streamwise_recommendations");
                    localStorage.removeItem("streamwise_optimized_services");
                    localStorage.setItem("streamwise_cache_version", CACHE_VERSION);
                }

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
                    await loadData(currentServices, currentGenres, signals, relPref, currentBudget, statusMap);
                }
            } catch (e) {
                console.debug("Dashboard init error", e);
                setRecommended([]);
                setOptimizedServices([]);
                setServices(["netflix", "hbo"]);
                setTargetBudget(null);
                setLoading(false);
            }
        }
        init();
    }, []);

    const activeOptimizedServices = optimizedServices.filter(
        (s) => s.recommendedStatus === "active" || s.recommendedStatus === "always"
    );
    const activeServiceIds = new Set(activeOptimizedServices.map((s) => s.serviceId));

    const handleStatusToggle = (svc: OptimizedService) => {
        const order = ["active", "paused", "always"] as const;
        const cur = svc.recommendedStatus || "paused";
        const next = order[(order.indexOf(cur) + 1) % order.length];
        const updated = optimizedServices.map((s) =>
            s.serviceId === svc.serviceId ? { ...s, recommendedStatus: next } : s
        );
        setOptimizedServices(updated);
        setTotalMonthlyCost(
            updated.filter((s) => s.recommendedStatus === "active" || s.recommendedStatus === "always")
                .reduce((sum, s) => sum + s.monthlyPrice, 0)
        );
        setConfirmed(false);
    };

    useEffect(() => {
        setDismissed(new Set());
        setPage(1);
    }, [recommended]);

    const handleDismiss = (showId: string) => {
        setDismissed((prev) => new Set([...prev, showId]));
    };

    const handleRate = (showId: string, rating: "up" | "down") => {
        const updated = { ...showRatings, [showId]: rating };
        setShowRatings(updated);
        try {
            localStorage.setItem("streamwise_show_ratings", JSON.stringify(updated));
        } catch { /* ignore */ }
        handleDismiss(showId);
        setPendingDismiss(null);
    };

    const sortedShows = useMemo(() => {
        const visible = recommended.filter((s) => !dismissed.has(s.showId));
        if (sortOrder === "popularity") return [...visible].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
        if (sortOrder === "az") return [...visible].sort((a, b) => a.title.localeCompare(b.title));
        return visible;
    }, [recommended, dismissed, sortOrder]);

    const totalPages = Math.min(Math.ceil(sortedShows.length / PAGE_SIZE), MAX_PAGES);
    const clampedPage = Math.min(page, totalPages || 1);
    const pageShows = sortedShows.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

    const handleConfirm = () => {
        const newStatuses: Record<string, string> = {};
        const activeIds: string[] = [];
        for (const svc of optimizedServices) {
            newStatuses[svc.serviceId] = svc.recommendedStatus;
            if (svc.recommendedStatus === "active" || svc.recommendedStatus === "always") activeIds.push(svc.serviceId);
        }
        localStorage.setItem("streamwise_user_service_statuses", JSON.stringify(newStatuses));
        localStorage.setItem("streamwise_user_services", JSON.stringify(activeIds));
        localStorage.setItem("streamwise_optimized_services", JSON.stringify(optimizedServices));
        localStorage.setItem("streamwise_recommendations", JSON.stringify(recommended));
        setServices(activeIds);
        setConfirmed(true);
    };

    return (
        <div className="min-h-screen p-6 bg-zinc-50 text-zinc-900 font-sans dark:bg-black">
            <main className="mx-auto max-w-4xl pb-6">
                {/* Header */}
                <header className="mb-8 py-12">
                    <motion.h1
                        className="text-3xl font-semibold dark:text-zinc-50"
                        {...fadeInUp}
                    >
                        Welcome back{headline ? `, ${headline}` : ""}.
                    </motion.h1>
                    <motion.p
                        className="mt-2 text-zinc-500 dark:text-zinc-400"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" as const }}
                    >
                        Here's what's waiting for you.
                    </motion.p>
                </header>

                {/* What to Watch — shown first */}
                <section className="mb-12">
                    <div className="flex items-center justify-between mb-4">
                        <motion.h2
                            className="text-xl font-medium dark:text-zinc-50"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" as const }}
                        >
                            What to Watch
                        </motion.h2>
                        {!loading && recommended.length > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                                {(["recommended", "popularity", "az"] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => { setSortOrder(opt); setPage(1); }}
                                        className={`px-2.5 py-1 rounded-md transition-colors ${
                                            sortOrder === opt
                                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                        }`}
                                    >
                                        {opt === "recommended" ? "Recommended" : opt === "popularity" ? "Popularity" : "A–Z"}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <motion.p
                        className="w-2/3 text-sm text-zinc-500 mb-4 dark:text-zinc-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" as const }}
                    >
                        Your recommended shows. Clear any you've watched or don't want.
                    </motion.p>

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
                    ) : sortedShows.length === 0 ? (
                        <p className="text-zinc-500">No recommendations found. Try adjusting your preferences.</p>
                    ) : (
                        <>
                            <motion.div
                                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                                variants={staggerContainer}
                                initial="initial"
                                animate="animate"
                            >
                                {pageShows.map((show) => {
                                    const isFromActiveService = activeServiceIds.has(show.serviceId);
                                    const serviceName = SERVICE_CATALOG[show.serviceId]?.name ?? show.serviceId;
                                    return (
                                        <motion.div
                                            key={show.showId}
                                            variants={staggerItem}
                                            className={`relative rounded-lg border bg-white p-4 shadow-sm ${isFromActiveService ? "border-zinc-200" : "border-dashed border-zinc-300 opacity-80"}`}
                                        >
                                            <button
                                                onClick={() => setPendingDismiss(show)}
                                                aria-label={`Remove ${show.title} from watchlist`}
                                                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                            >
                                                ✕
                                            </button>
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
                                                <div className="flex-1 pr-4">
                                                    <h3 className="text-lg font-semibold">{show.title}</h3>
                                                    {(() => {
                                                        const label = getSeasonLabel(show);
                                                        if (label === "new") return <span className="inline-block mt-0.5 mb-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">New season</span>;
                                                        if (label === "soon") return <span className="inline-block mt-0.5 mb-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Season coming soon</span>;
                                                        return null;
                                                    })()}
                                                    <p className="text-sm text-zinc-500">{show.year} • {show.genres.join(", ")}</p>
                                                    <p className="mt-2 text-sm text-zinc-600 line-clamp-3">{show.overview ?? "No overview available."}</p>
                                                    {show.actors && show.actors.length > 0 && (
                                                        <p className="mt-2 text-sm text-zinc-500">Starring: {show.actors.slice(0, 2).join(", ")}</p>
                                                    )}
                                                    <div className="mt-3 text-sm flex items-center justify-between">
                                                        <span className={isFromActiveService ? "text-zinc-700 font-medium" : "text-zinc-400"}>
                                                            {serviceName}{!isFromActiveService && " (not active)"}
                                                        </span>
                                                        {show.popularity && <span className="text-zinc-400">pop {show.popularity}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 mt-6">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={clampedPage === 1}
                                        className="px-3 py-1.5 text-sm rounded-md border border-zinc-200 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-zinc-700 dark:hover:bg-zinc-800"
                                    >
                                        ← Prev
                                    </button>
                                    <span className="text-sm text-zinc-500">{clampedPage} / {totalPages}</span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={clampedPage === totalPages}
                                        className="px-3 py-1.5 text-sm rounded-md border border-zinc-200 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-zinc-700 dark:hover:bg-zinc-800"
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Budget + Recommended Services */}
                <section className="mb-8">
                    <motion.div
                        className="mb-6"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" as const }}
                    >
                        <h2 className="text-2xl font-bold dark:text-white">
                            ${totalMonthlyCost.toFixed(2)}/mo
                        </h2>
                        {targetBudget !== null && (
                            <span className={totalMonthlyCost <= targetBudget ? "text-green-600 text-sm" : "text-amber-600 text-sm"}>
                                {totalMonthlyCost <= targetBudget ? "under" : "over"} ${targetBudget} target
                            </span>
                        )}
                    </motion.div>

                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-medium dark:text-zinc-50">Recommended Services</h2>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="px-4 py-1.5 text-sm font-medium rounded-md bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                        >
                            {confirmed ? "Confirmed!" : "Confirm"}
                        </button>
                    </div>
                    <p className="text-sm text-zinc-500 mb-4 dark:text-zinc-400">
                        Based on your taste and budget. Toggle to adjust, then confirm.
                    </p>
                    <motion.div
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                    >
                        {optimizedServices.map((svc) => {
                            const isActive = svc.recommendedStatus === "active" || svc.recommendedStatus === "always";
                            return (
                                <motion.div
                                    key={svc.serviceId}
                                    variants={staggerItem}
                                    className={`rounded-lg border p-4 shadow-sm transition-opacity ${isActive
                                        ? "border-zinc-200 bg-white"
                                        : "border-dashed border-zinc-300 bg-zinc-50 opacity-50 dark:bg-zinc-900"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className={`text-lg font-semibold ${!isActive ? "dark:text-zinc-50" : ""}`}>{svc.name}</h3>
                                            <p className="text-sm text-zinc-500">${svc.monthlyPrice.toFixed(2)} / month</p>
                                            <p className="text-xs text-zinc-400">{svc.showCount} shows for you</p>
                                        </div>
                                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-400">
                                            <button onClick={() => handleStatusToggle(svc)} className="underline">
                                                {svc.recommendedStatus}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </section>

                {/* Get new recommendations */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={() => router.push("/onboarding/1")}
                        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2 transition-colors"
                    >
                        Get new recommendations
                    </button>
                </div>
            </main>

            {/* Dismiss modal */}
            <AnimatePresence>
                {pendingDismiss && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setPendingDismiss(null)}
                    >
                        <motion.div
                            className="w-full max-w-sm bg-white rounded-lg p-6 shadow-xl dark:bg-zinc-900"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold mb-1 dark:text-zinc-50">Remove from watchlist?</h3>
                            <p className="text-sm text-zinc-500 mb-5 dark:text-zinc-400 line-clamp-1">{pendingDismiss.title}</p>
                            <div className="flex gap-3 mb-6">
                                <button
                                    onClick={() => { handleDismiss(pendingDismiss.showId); setPendingDismiss(null); }}
                                    className="flex-1 rounded-md bg-zinc-900 text-white py-2 font-medium hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setPendingDismiss(null)}
                                    className="flex-1 rounded-md border border-zinc-200 py-2 font-medium hover:bg-zinc-50 dark:border-zinc-700"
                                >
                                    No
                                </button>
                            </div>
                            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                                <p className="text-xs text-zinc-400 mb-3">How was it?</p>
                                <div className="flex gap-4 justify-center">
                                    <button
                                        onClick={() => handleRate(pendingDismiss.showId, "up")}
                                        className={`p-2.5 rounded-full transition-colors ${showRatings[pendingDismiss.showId] === "up" ? "bg-green-100 text-green-600" : "hover:bg-zinc-100 text-zinc-500 dark:hover:bg-zinc-800"}`}
                                        aria-label="Thumbs up"
                                    >
                                        <ThumbsUp filled={showRatings[pendingDismiss.showId] === "up"} />
                                    </button>
                                    <button
                                        onClick={() => handleRate(pendingDismiss.showId, "down")}
                                        className={`p-2.5 rounded-full transition-colors ${showRatings[pendingDismiss.showId] === "down" ? "bg-red-100 text-red-500" : "hover:bg-zinc-100 text-zinc-500 dark:hover:bg-zinc-800"}`}
                                        aria-label="Thumbs down"
                                    >
                                        <ThumbsDown filled={showRatings[pendingDismiss.showId] === "down"} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
