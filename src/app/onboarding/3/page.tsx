"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { mockShows } from "../../../data/mockShows";
import type { Show } from "../../../models/types";

// SCREEN 3 — Taste Calibration
// 3A: Genres multi-select
// 3B: Show signals (seen / skip / want)
// Persists: `streamwise_user_genres` (string[]), `streamwise_user_showSignals` (object)

const GENRES = [
    "Crime",
    "Drama",
    "Thriller",
    "Mystery",
    "Action",
    "Sci-Fi",
    "Comedy",
    "Documentary",
    "Horror",

];

export default function Onboarding3() {
    const router = useRouter();
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [showSignals, setShowSignals] = useState<Record<string, string>>({});
    const [revealSeen, setRevealSeen] = useState(false);

    useEffect(() => {
        try {
            const g = localStorage.getItem("streamwise_user_genres");
            if (g) setSelectedGenres(JSON.parse(g));
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

    function toggleGenre(g: string) {
        setSelectedGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
    }

    function setSignal(showId: string, signal: string) {
        setShowSignals((cur) => ({ ...cur, [showId]: signal }));
    }

    function handleContinue() {
        // Already persisted via effects
        router.push("/onboarding/4");
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
            <main className="mx-auto max-w-3xl bg-white p-8 rounded shadow">
                <h1 className="text-2xl font-semibold">What kinds of shows do you actually look forward to watching?</h1>
                <p className="text-sm text-zinc-600 mt-2">Select genres that best describe what you enjoy.</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 mb-6">
                    {GENRES.map((g) => {
                        const chosen = selectedGenres.includes(g);
                        return (
                            <button key={g} onClick={() => toggleGenre(g)} className={`p-3 rounded-lg text-left border ${chosen ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                                <div className="font-medium">{g}</div>
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
                    <section className="mt-8">
                        <h2 className="text-xl font-semibold">Anything here you’ve already watched—or want us to skip?</h2>
                        <p className="text-sm text-zinc-600 mt-1">This keeps recommendations focused on what’s new for you.</p>

                        <div className="grid grid-cols-1 gap-4 mt-4">
                            {mockShows.slice(0, 8).map((show: Show) => (
                                <div key={show.showId} className="flex items-center gap-4 border rounded p-3 bg-white">
                                    <img src={show.imageSet?.verticalPoster?.w360 ?? "/vertical-poster.svg"} alt={show.title} width={56} height={84} className="rounded-sm object-cover" />
                                    <div className="flex-1">
                                        <div className="font-medium">{show.title}</div>
                                        <div className="text-sm text-zinc-500">{show.serviceId.replace("svc_", "")}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setSignal(show.showId, "seen")} className={`px-2 py-1 rounded ${showSignals[show.showId] === "seen" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Seen</button>
                                        <button onClick={() => setSignal(show.showId, "skip")} className={`px-2 py-1 rounded ${showSignals[show.showId] === "skip" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Not for me</button>
                                        <button onClick={() => setSignal(show.showId, "want")} className={`px-2 py-1 rounded ${showSignals[show.showId] === "want" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>Want</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-between">
                            <button onClick={() => setRevealSeen(false)} className="text-sm text-zinc-500">Previous</button>
                            <button onClick={handleContinue} className="rounded-md bg-zinc-900 text-white px-4 py-2">Continue</button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
