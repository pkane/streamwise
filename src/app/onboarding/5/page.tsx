"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BUDGET_OPTIONS } from "../../../data/constants";
import { motion, fadeInUp, staggerContainer, staggerItem } from "../../../components/motion";

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
                <header className="text-center text-balance py-12 min-h-48">
                    <motion.h1 className="text-2xl font-semibold font-display dark:text-zinc-50" {...fadeInUp}>
                        Do you want us to optimize this around a monthly budget?
                    </motion.h1>
                    <motion.p
                        className="text-sm text-zinc-400"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" as const }}
                    >
                        We’ll still surface everything worth watching. This just helps us time things better.
                    </motion.p>
                </header>

                <div className="bg-white p-8 rounded shadow">
                    <motion.div
                        className="space-y-3 mb-6"
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                    >
                        {BUDGET_OPTIONS.map((opt) => (
                            <motion.label key={opt.id} variants={staggerItem} className={`block p-4 rounded-lg border cursor-pointer ${target === opt.value ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"}`}>
                                <input type="radio" name="budget" checked={target === opt.value} onChange={() => setTarget(opt.value)} />
                                <span className="ml-3 font-medium">{opt.label}</span>
                            </motion.label>
                        ))}
                    </motion.div>

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
