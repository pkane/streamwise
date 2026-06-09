"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, fadeInUp, staggerContainer, staggerItem } from "../../../components/motion";

// SCREEN 4 — Viewing Style (Release Preference)
// Persists to `streamwise_user_releasePreference` as "weekly" | "binge" | "mixed"

export default function Onboarding4() {
    const router = useRouter();
    const [pref, setPref] = useState<string | null>(null);

    useEffect(() => {
        try {
            const v = localStorage.getItem("streamwise_user_releasePreference");
            if (v) setPref(v);
        } catch (e) { }
    }, []);

    function handleContinue() {
        try {
            if (pref) localStorage.setItem("streamwise_user_releasePreference", pref);
        } catch (e) { }
        router.push("/onboarding/5");
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
            <main className="mx-auto max-w-3xl">
                <header className="text-center text-balance py-12 min-h-48">
                    <motion.h1 className="text-2xl font-semibold dark:text-zinc-50" {...fadeInUp}>
                        How do you usually like shows to release?
                    </motion.h1>
                    <motion.p
                        className="text-sm text-zinc-400"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" as const }}
                    >
                        This helps us decide when a service is worth activating.
                    </motion.p>
                </header>

                <div className="bg-white p-8 rounded shadow">
                    <motion.div
                        className="space-y-3 mb-6"
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                    >
                        <motion.label variants={staggerItem} className={`block p-4 rounded-lg border cursor-pointer ${pref === "weekly" ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                            <input type="radio" name="release" checked={pref === "weekly"} onChange={() => setPref("weekly")} />
                            <span className="ml-3 font-medium">I’m fine watching week to week</span>
                        </motion.label>

                        <motion.label variants={staggerItem} className={`block p-4 rounded-lg border cursor-pointer ${pref === "binge" ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                            <input type="radio" name="release" checked={pref === "binge"} onChange={() => setPref("binge")} />
                            <span className="ml-3 font-medium">I prefer waiting until a full season is out</span>
                        </motion.label>

                        <motion.label variants={staggerItem} className={`block p-4 rounded-lg border cursor-pointer ${pref === "mixed" ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                            <input type="radio" name="release" checked={pref === "mixed"} onChange={() => setPref("mixed")} />
                            <span className="ml-3 font-medium">It depends on the show</span>
                        </motion.label>
                    </motion.div>

                    <div className="flex justify-between items-center">
                        <button className="text-sm text-zinc-500" onClick={() => router.back()}>Back</button>
                        <button
                            onClick={handleContinue}
                            className={`rounded-md px-4 py-2 text-white ${pref ? "bg-zinc-900" : "bg-zinc-200 text-zinc-500 cursor-not-allowed"}`}
                            disabled={!pref}
                        >
                            Continue
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
}
