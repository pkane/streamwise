"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { mockShows } from "../../../data/mockShows";
import { recommendShows } from "../../../lib/recommendations";
import type { Show } from "../../../models/types";

import { DEFAULT_SERVICES } from "../../../data/constants";

// Build a quick lookup for local logic; keep the centralized data authoritative
const SERVICE_CATALOG = DEFAULT_SERVICES.reduce((acc: Record<string, any>, s: any) => {
    acc[s.id] = { serviceId: s.serviceId, name: s.name, monthlyPrice: s.monthlyPrice, status: s.status };
    return acc;
}, {} as Record<string, any>);

const GENRE_HEADLINES: Record<string, string> = {
    Action: "The Adrenaline Architect",
    Adventure: "The Journey Junkie",
    Animation: "The Animation Aficionado",
    Comedy: "The Punchline Professional",
    Crime: "The Crime-Drama Kingpin",
    Documentary: "The Truth Seeker",
    Drama: "The Prestige Drama Devotee",
    Family: "The Family-Night MVP",
    Fantasy: "The Realm Roamer",
    History: "The History Buff Supreme",
    Horror: "The Master of Mayhem",
    Music: "The Soundtrack Curator",
    Mystery: "The Plot-Twist Specialist",
    News: "The Informed Insider",
    Reality: "The Reality-TV Ringmaster",
    Romance: "The Hopeless Romantic (In the Best Way)",
    "Science Fiction": "The Future-World Navigator",
    "Talk Show": "The Cultural Conversationalist",
    Thriller: "The Suspense Strategist",
    War: "The Battlefield Historian",
    Western: "The Modern Gunslinger",
};

export default function Onboarding6() {
    const router = useRouter();
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [genres, setGenres] = useState<string[]>([]);
    const [targetBudget, setTargetBudget] = useState<number | null>(null);
    const [recommended, setRecommended] = useState<Show[]>([]);
    const [headline, setHeadline] = useState<string>("Watch with confidence.");
    const [insight, setInsight] = useState<string>("");

    useEffect(() => {
        // Load persisted onboarding values with safe defaults
        try {
            const svcRaw = localStorage.getItem("streamwise_user_services");
            const svc = svcRaw ? (JSON.parse(svcRaw) as string[]) : [];
            const sids = svc.length > 0 ? svc : ["netflix", "max", "hulu", "apple"];
            setSelectedServiceIds(sids);

            const gRaw = localStorage.getItem("streamwise_user_genres");
            const g = gRaw ? (JSON.parse(gRaw) as string[]) : [];
            setGenres(g);

            const tb = localStorage.getItem("streamwise_user_targetBudget");
            if (tb === null) setTargetBudget(null);
            else if (tb === "null") setTargetBudget(null);
            else setTargetBudget(Number(tb));
        } catch (e) {
            setSelectedServiceIds(["netflix", "max", "hulu", "apple"]);
            setGenres([]);
            setTargetBudget(null);
        }
    }, []);

    useEffect(() => {
        // Build services array used by recommendation engine
        const services = selectedServiceIds.map((id) => {
            const s = SERVICE_CATALOG[id];
            return s ? { serviceId: s.serviceId, name: s.name, monthlyPrice: s.monthlyPrice, status: s.status } : { serviceId: `svc_${id}`, name: id, monthlyPrice: 0, status: "paused" };
        });

        // pool: only shows available on selected services (if any), else use all
        const pool = mockShows.filter((sh) => selectedServiceIds.length ? selectedServiceIds.includes(sh.serviceId.replace("svc_", "")) : true);

        const user = { id: "anon", name: "You", targetBudget: targetBudget ?? 0, genres: genres.length ? genres : ["Crime"], bingeTolerance: 3 };

        const recs = recommendShows(user as any, services as any, pool as any, 8);
        setRecommended(recs);

        // Persist recommendations for dashboard
        try {
            localStorage.setItem("streamwise_recommendations", JSON.stringify(recs));
        } catch (e) { }

        // Headline: pick first genre or fallback to top genre from recs
        const primaryGenre = genres.length ? genres[0] : (() => {
            const counts: Record<string, number> = {};
            recs.forEach((r) => r.genres.forEach((g) => counts[g] = (counts[g] || 0) + 1));
            const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
            return sorted[0] ?? "Drama";
        })();

        setHeadline(GENRE_HEADLINES[primaryGenre] ?? "Watch with confidence.");

        // Insight: simple computation from recs by service counts
        const countsByService: Record<string, number> = {};
        recs.forEach((r) => countsByService[r.serviceId] = (countsByService[r.serviceId] || 0) + 1);
        const sortedServices = Object.keys(countsByService).sort((a, b) => countsByService[b] - countsByService[a]);
        if (sortedServices.length >= 2) {
            const s1 = sortedServices[0].replace("svc_", "");
            const s2 = sortedServices[1].replace("svc_", "");
            setInsight(`In the coming weeks, new releases make ${s1.charAt(0).toUpperCase() + s1.slice(1)} and ${s2.charAt(0).toUpperCase() + s2.slice(1)} strong picks. We'll let you know when to switch.`);
        } else if (sortedServices.length === 1) {
            const s1 = sortedServices[0].replace("svc_", "");
            setInsight(`${s1.charAt(0).toUpperCase() + s1.slice(1)} looks like the best pick right now.`);
        } else {
            setInsight("We’ll surface the best services based on new releases and your tastes.");
        }
    }, [selectedServiceIds, genres, targetBudget]);

    const total = selectedServiceIds.reduce((sum, id) => {
        const s = SERVICE_CATALOG[id as keyof typeof SERVICE_CATALOG];
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
                                <span key={id} className="px-3 py-1 bg-zinc-100 rounded-full text-sm">{(SERVICE_CATALOG as any)[id]?.name ?? id}</span>
                            ))}
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="text-lg font-medium">You’ll spend ${total.toFixed(2)}/month</div>
                        {diff !== null && diff !== undefined && (
                            <div className="text-sm text-zinc-600">That’s ${Math.abs(diff).toFixed(2)} {diff > 0 ? "less" : "more"} than your target.</div>
                        )}
                    </div>

                    <div className="mb-6 p-4 rounded border bg-zinc-50 text-sm">{insight}</div>

                    <div className="flex justify-end">
                        <button onClick={() => router.push("/dashboard")} className="rounded-md bg-zinc-900 text-white px-4 py-2">Go to my dashboard</button>
                    </div>
                </div>

            </main>
        </div>
    );
}
