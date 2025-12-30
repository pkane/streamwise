"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// SCREEN 5 — Budget Target
// Persists to `streamwise_user_targetBudget` as number or null

const BUDGET_OPTIONS: Array<{ id: string; label: string; value: number | null }> = [
    { id: "u50", label: "Under $50", value: 50 },
    { id: "50-75", label: "$50–$75", value: 75 },
    { id: "75-100", label: "$75–$100", value: 100 },
    { id: "100+", label: "$100+", value: 150 },
    { id: "none", label: "I don’t have a budget — just maximize value", value: null },
];

export default function Onboarding5() {
    const router = useRouter();
    const [target, setTarget] = useState<number | null | undefined>(undefined);

    useEffect(() => {
        try {
            const raw = localStorage.getItem("streamwise_user_targetBudget");
            if (raw !== null) setTarget(raw === "null" ? null : Number(raw));
        } catch (e) { }
    }, []);

    function handleContinue() {
        try {
            localStorage.setItem("streamwise_user_targetBudget", String(target ?? null));
        } catch (e) { }
        router.push("/onboarding/6");
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
            <main className="mx-auto max-w-3xl">
                <header className="text-center text-balance py-12 h-48">
                    <h1 className="text-2xl font-semibold dark:text-zinc-50">Do you want us to optimize this around a monthly budget?</h1>
                    <p className="text-sm text-zinc-400">We’ll still surface everything worth watching. This just helps us time things better.</p>
                </header>

                <div className="bg-white p-8 rounded shadow">
                    <div className="space-y-3 mb-6">
                        {BUDGET_OPTIONS.map((opt) => (
                            <label key={opt.id} className={`block p-4 rounded-lg border cursor-pointer ${target === opt.value ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                                <input type="radio" name="budget" checked={target === opt.value} onChange={() => setTarget(opt.value)} />
                                <span className="ml-3 font-medium">{opt.label}</span>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-between items-center">
                        <button className="text-sm text-zinc-500" onClick={() => router.back()}>Back</button>
                        <button
                            onClick={handleContinue}
                            className={`rounded-md px-4 py-2 text-white ${target !== undefined ? "bg-zinc-900" : "bg-zinc-200 text-zinc-500 cursor-not-allowed"}`}
                            disabled={target === undefined}
                        >
                            Continue
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
}
