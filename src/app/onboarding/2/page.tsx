"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// SCREEN 2 — Household Inclusion
// Stores `streamwise_user_householdMode` as "solo" | "household" | "deferred"

export default function Onboarding2() {
    const router = useRouter();
    const [mode, setMode] = useState<string | null>(null);

    useEffect(() => {
        try {
            const v = localStorage.getItem("streamwise_user_householdMode");
            if (v) setMode(v);
        } catch (e) { }
    }, []);

    function handleContinue() {
        try {
            if (mode) localStorage.setItem("streamwise_user_householdMode", mode);
        } catch (e) { }
        router.push("/onboarding/3");
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
            <main className="mx-auto max-w-3xl">
                <header className="text-center text-balance py-12 h-48">
                    <h1 className="text-2xl font-semibold dark:text-zinc-50">Want us to include other household members in your recommendations?</h1>
                    <p className="text-sm text-zinc-400">This helps balance recommendations without adding extra subscriptions.</p>
                </header>


                <div className="bg-white p-10 rounded-lg shadow">
                    <div className="space-y-3 mb-6">
                        <label className={`block p-4 rounded-lg border cursor-pointer ${mode === "solo" ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                            <input type="radio" name="household" checked={mode === "solo"} onChange={() => setMode("solo")} />
                            <span className="ml-3 font-medium">Just me</span>
                        </label>

                        <label className={`block p-4 rounded-lg border cursor-pointer ${mode === "household" ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                            <input type="radio" name="household" checked={mode === "household"} onChange={() => setMode("household")} />
                            <span className="ml-3 font-medium">Include a partner or family</span>
                        </label>

                        <label className={`block p-4 rounded-lg border cursor-pointer ${mode === "deferred" ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                            <input type="radio" name="household" checked={mode === "deferred"} onChange={() => setMode("deferred")} />
                            <span className="ml-3 font-medium">I’ll set this up later</span>
                        </label>
                    </div>

                    <div className="flex justify-between items-center">
                        <button className="text-sm text-zinc-500" onClick={() => router.back()}>Back</button>
                        <button
                            onClick={handleContinue}
                            className={`rounded-md px-4 py-2 text-white ${mode ? "bg-zinc-900" : "bg-zinc-200 text-zinc-500 cursor-not-allowed"}`}
                            disabled={!mode}
                        >
                            Continue
                        </button>
                    </div>

                </div>

            </main>
        </div>
    );
}
