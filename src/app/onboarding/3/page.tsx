"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Show } from "../../../models/types";
import { GENRES } from "../../../data/constants";

// SCREEN 3 — Taste Calibration
// 3A: Genres multi-select
// 3B: Show signals (seen / skip / want)
// Persists: `streamwise_user_genres` (string[]), `streamwise_user_showSignals` (object)

// Exported: fetch shows using the API's expected genre ids derived from selected display names
export async function fetchShowsByGenres(selectedGenres: string[]) {
    const chosen = (selectedGenres && selectedGenres.length ? selectedGenres : ["crime"]);
    const genreIds = chosen.map((val) => {
        // if already an id
        const byId = GENRES.find((g: any) => g.id === String(val).toLowerCase());
        if (byId) return byId.id;
        // if a display name
        const byName = GENRES.find((g: any) => g.name.toLowerCase() === String(val).toLowerCase());
        if (byName) return byName.id;
        // fallback slug
        return String(val).toLowerCase().replace(/[^a-z0-9]+/g, "");
    });

    const genresParam = encodeURIComponent(JSON.stringify(genreIds));
    const url = `/api/shows?genres=${genresParam}`;
    console.debug("fetchShowsByGenres - requesting", { selectedGenres, genreIds, url });
    const res = await fetch(url);
    if (!res.ok) {
        console.debug("fetchShowsByGenres - non-ok response", { status: res.status });
        throw new Error(`shows fetch failed: ${res.status}`);
    }
    const data = await res.json();
    console.debug("fetchShowsByGenres - response", { ok: res.ok, status: res.status, count: Array.isArray(data) ? data.length : 0 });
    return Array.isArray(data) ? data : [];
}

export default function Onboarding3() {
    const router = useRouter();
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [showSignals, setShowSignals] = useState<Record<string, string>>({});
    const [revealSeen, setRevealSeen] = useState(false);
    const [shows, setShows] = useState<Show[]>([]);
    const [loadingShows, setLoadingShows] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("streamwise_user_genres");
            if (raw) {
                const parsed = JSON.parse(raw) as string[];
                const normalized = parsed.map((entry) => {
                    const asStr = String(entry);
                    const byId = GENRES.find((x: any) => x.id === asStr.toLowerCase());
                    if (byId) return byId.id;
                    const byName = GENRES.find((x: any) => x.name.toLowerCase() === asStr.toLowerCase());
                    if (byName) return byName.id;
                    return asStr.toLowerCase().replace(/[^a-z0-9]+/g, "");
                });
                setSelectedGenres(normalized);
            }

            const s = localStorage.getItem("streamwise_user_showSignals");
            if (s) setShowSignals(JSON.parse(s));
        } catch (e) { }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem("streamwise_user_genres", JSON.stringify(selectedGenres));
        } catch (e) { }
    }, [selectedGenres]);

    useEffect(() => {
        try {
            localStorage.setItem("streamwise_user_showSignals", JSON.stringify(showSignals));
        } catch (e) { }
    }, [showSignals]);

    function toggleGenre(id: string) {
        setSelectedGenres((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    }

    function setSignal(showId: string, signal: string) {
        setShowSignals((cur) => ({ ...cur, [showId]: signal }));
    }

    function handleContinue() {
        // Already persisted via effects
        router.push("/onboarding/4");
    }

    useEffect(() => {
        // When the seen/skip/want section is revealed, fetch real shows from the server
        if (!revealSeen) return;

        let aborted = false;
        async function load() {
            console.log(revealSeen)
            setLoadingShows(true);
            try {
                const data = await fetchShowsByGenres(selectedGenres);
                if (aborted) return;
                setShows(data);
            } catch (e) {
                console.debug("onboarding/3 - fetchShowsByGenres error", e);
                if (!aborted) setShows([]);
            } finally {
                if (!aborted) setLoadingShows(false);
            }
        }

        load();

        return () => { aborted = true; };
    }, [revealSeen]);

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
            <main className="mx-auto max-w-3xl">
                <header className="text-center text-balance py-12 min-h-48">
                    <h1 className="text-2xl font-semibold dark:text-zinc-50">What kinds of shows do you actually look forward to watching?</h1>
                    <p className="text-sm text-zinc-400">Select genres that best describe what you enjoy.</p>
                </header>

                <div className="bg-white p-8 rounded shadow">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 mb-6">
                        {GENRES.map((g) => {
                            const chosen = selectedGenres.includes(g.id);
                            return (
                                <button key={g.id} onClick={() => toggleGenre(g.id)} className={`p-3 rounded-lg text-left border ${chosen ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                                    <div className="font-medium">{g.name}</div>
                                    <div className="text-xs text-zinc-500 mt-1">e.g. examples</div>
                                </button>
                            );
                        })}
                    </div>

                    <div className={`flex justify-between items-center ${revealSeen ? "hidden" : ""}`}>
                        <button className="text-sm text-zinc-500" onClick={() => router.back()}>Back</button>
                        <button onClick={() => setRevealSeen(true)} className="rounded-md bg-zinc-900 text-white px-4 py-2">Next</button>
                    </div>

                    {/* 3B: Seen / Skip / Want — revealed after selecting genres */}
                    {revealSeen && (
                        <section className="mt-12">
                            <h2 className="text-xl font-semibold">Anything here you’ve already watched—or want us to skip?</h2>
                            <p className="text-sm text-zinc-600 mt-1">This keeps recommendations focused on what’s new for you.</p>

                            <div className="grid grid-cols-1 gap-4 mt-6">
                                {loadingShows ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <div key={`loading-${i}`} className="flex items-center gap-4 border rounded p-3 bg-white animate-pulse">
                                            <div className="w-14 h-20 bg-zinc-200 rounded" />
                                            <div className="flex-1">
                                                <div className="h-4 bg-zinc-200 w-3/4 mb-2 rounded" />
                                                <div className="h-3 bg-zinc-200 w-1/3 rounded" />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="w-16 h-8 bg-zinc-200 rounded" />
                                                <div className="w-16 h-8 bg-zinc-200 rounded" />
                                                <div className="w-16 h-8 bg-zinc-200 rounded" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    (shows.length ? shows : []).slice(0, 8).map((show: Show) => {
                                        const sid = (show as any).showId ?? (show as any).id ?? (show as any).title;
                                        return (
                                            <div key={sid} className="flex items-center gap-4 border rounded p-3 bg-white">
                                                <img src={(show as any).imageSet?.verticalPoster?.w360 ?? (show as any).poster ?? "/vertical-poster.svg"} alt={(show as any).title ?? (show as any).name} width={56} height={84} className="rounded-sm object-cover" />
                                                <div className="flex-1">
                                                    <div className="font-medium">{(show as any).title ?? (show as any).name}</div>
                                                    <div className="text-sm text-zinc-500">{((show as any).serviceId ?? "").replace?.("svc_", "")}</div>
                                                </div>
                                                <div className="flex gap-2 flex-wrap md:flex-nowrap">
                                                    <button onClick={() => setSignal(sid, "seen")} className={`basis-full md:basis-auto px-2 py-1 rounded ${showSignals[sid] === "seen" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Seen</button>
                                                    <button onClick={() => setSignal(sid, "skip")} className={`basis-full md:basis-auto px-2 py-1 rounded ${showSignals[sid] === "skip" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Not for me</button>
                                                    <button onClick={() => setSignal(sid, "want")} className={`basis-full md:basis-auto px-2 py-1 rounded ${showSignals[sid] === "want" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Want</button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                {!loadingShows && !shows.length && (
                                    <div className="text-sm text-zinc-500">No shows found for your selected genres.</div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-between">
                                <button onClick={() => setRevealSeen(false)} className="text-sm text-zinc-500">Previous</button>
                                <button onClick={handleContinue} className="rounded-md bg-zinc-900 text-white px-4 py-2">Continue</button>
                            </div>
                        </section>
                    )}
                </div>

            </main>
        </div>
    );
}
