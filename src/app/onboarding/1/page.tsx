"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Onboarding Screen 1 — Services You Have
// Purpose: collect baseline inventory of services the user currently has.
// TODO: persist to backend when auth / DB exists. For now we store in localStorage.

import { DEFAULT_SERVICES as DEFAULT_SERVICE_OPTIONS } from "../../../data/constants";

type ServiceOption = { id: string; name: string };

// Map the centralized DEFAULT_SERVICES into the local ServiceOption shape
const DEFAULT_SERVICES: ServiceOption[] = DEFAULT_SERVICE_OPTIONS.map((s: any) => ({ id: s.id, name: s.name }));

export default function OnboardingStep1() {
    const router = useRouter();
    const [services, setServices] = useState<ServiceOption[]>(DEFAULT_SERVICES);
    const [selected, setSelected] = useState<string[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [showOtherModal, setShowOtherModal] = useState(false);
    const [otherValue, setOtherValue] = useState("");

    useEffect(() => {
        // Hydrate both previously-added "Other" services and the user's selected IDs
        // in a single initializer to avoid ordering/visibility races.
        try {
            const extraRaw = localStorage.getItem("streamwise_extra_services");
            const extras = extraRaw ? (JSON.parse(extraRaw) as ServiceOption[]) : [];

            // Start from extras + defaults (extras first so they render at top)
            const initialServices = extras.concat(DEFAULT_SERVICES.filter((s) => !extras.find((e) => e.id === s.id)));
            setServices(initialServices);

            const raw = localStorage.getItem("streamwise_user_services");
            if (raw) {
                const parsed = JSON.parse(raw) as string[];
                setSelected(parsed);

                // If selected contains any ids not present in service list (edge case),
                // add minimal placeholders so the UI can render them as selected items.
                const missing = parsed.filter((id) => !initialServices.find((s) => s.id === id));
                if (missing.length) {
                    const placeholders = missing.map((id) => ({ id, name: id } as ServiceOption));
                    setServices((cur) => [...placeholders, ...cur]);
                }
            }
        } catch (e) {
            // ignore
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        // Only persist after initial hydration to avoid overwriting with empty array
        if (!hydrated) return;
        try {
            localStorage.setItem("streamwise_user_services", JSON.stringify(selected));
        } catch (e) { }
    }, [selected, hydrated]);

    function toggle(id: string) {
        setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    }

    function handleAddOther() {
        const trimmed = otherValue.trim();
        if (!trimmed) return;
        const id = `other_${Date.now()}`;
        const newService = { id, name: trimmed };
        setServices((cur) => [newService, ...cur]);
        setSelected((cur) => [id, ...cur]);
        setOtherValue("");
        setShowOtherModal(false);
        try {
            const extraRaw = localStorage.getItem("streamwise_extra_services");
            const extras = extraRaw ? (JSON.parse(extraRaw) as ServiceOption[]) : [];
            extras.unshift(newService);
            localStorage.setItem("streamwise_extra_services", JSON.stringify(extras));
        } catch (e) { }
        try {
            // Mark newly-added services as active by default and persist statuses
            const statusKey = "streamwise_user_service_statuses";
            const raw = localStorage.getItem(statusKey);
            const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
            map[id] = "active";
            localStorage.setItem(statusKey, JSON.stringify(map));
        } catch (e) { }
    }

    function handleSkip() {
        try {
            localStorage.setItem("streamwise_user_services", JSON.stringify([]));
            localStorage.setItem("streamwise_onboarding_skipped", "1");
        } catch (e) { }
        router.push("/onboarding/2");
    }

    function handleContinue() {
        try {
            localStorage.setItem("streamwise_user_services", JSON.stringify(selected));
        } catch (e) { }
        router.push("/onboarding/2");
    }

    return (
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
            <main className="mx-auto max-w-3xl">
                <header className="text-center py-12 min-h-48">
                    <h1 className="text-2xl font-semibold dark:text-zinc-50">Which streaming services do you currently have?</h1>
                    <p className="text-sm text-zinc-400 mt-2">Select everything you’re paying for—or regularly rotate through.</p>
                </header>

                <section>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {services.map((svc) => {
                            const isSelected = selected.includes(svc.id);
                            return (
                                <button
                                    key={svc.id}
                                    onClick={() => toggle(svc.id)}
                                    className={`flex items-center gap-3 rounded-lg border p-3 text-left text-zinc-800 hover:shadow-sm transition ${isSelected ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white"} `}
                                >
                                    <div className={`w-10 h-10 rounded-md flex items-center justify-center text-white font-semibold ${isSelected ? "bg-zinc-900" : "bg-zinc-400"}`}>
                                        {svc.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                                    </div>
                                    <div>
                                        <div className="font-medium">{svc.name}</div>
                                    </div>
                                </button>
                            );
                        })}

                        {/* Other card */}
                        <button
                            onClick={() => setShowOtherModal(true)}
                            className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-left hover:shadow-sm transition bg-white "
                        >
                            <div className="w-10 h-10 rounded-md flex items-center justify-center text-zinc-700 font-semibold bg-zinc-100">+</div>
                            <div>
                                <div className="font-medium text-zinc-800">Other</div>
                                <div className="text-sm text-zinc-500">Add manually</div>
                            </div>
                        </button>
                    </div>
                </section>

                <div className="h-24" />

                {/* Sticky continue bar */}
                <div className="fixed left-0 right-0 bottom-0 bg-transparent p-4 pointer-events-none">
                    <div className="mx-auto max-w-3xl pointer-events-auto">
                        <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
                            <button onClick={handleSkip} className="text-sm text-zinc-500">Skip</button>
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-zinc-600">{selected.length} selected</div>
                                <button
                                    onClick={handleContinue}
                                    disabled={selected.length < 1}
                                    className={`rounded-md py-2 px-4 font-medium ${selected.length >= 1 ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500 cursor-not-allowed"}`}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Other Modal (simple) */}
                {showOtherModal && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-md bg-white p-6 rounded-lg">
                            <h3 className="font-semibold mb-2">Add a service</h3>
                            <input
                                value={otherValue}
                                onChange={(e) => setOtherValue(e.target.value)}
                                className="w-full border rounded px-3 py-2 mb-4"
                                placeholder="e.g. Showtime, Peacock"
                            />
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowOtherModal(false)} className="px-3 py-2">Cancel</button>
                                <button onClick={handleAddOther} className="px-3 py-2 rounded bg-zinc-900 text-white">Add</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
