"use client";

import { JSX } from "react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import type { Show } from "../../models/types";
import { mockShows } from "../../data/mockShows";
import { recommendShows } from "../../lib/recommendations";

const SERVICE_CATALOG = {
    netflix: { serviceId: "svc_netflix", name: "Netflix", monthlyPrice: 15.49, status: "active" },
    max: { serviceId: "svc_max", name: "Max", monthlyPrice: 9.99, status: "paused" },
    hulu: { serviceId: "svc_hulu", name: "Hulu", monthlyPrice: 7.99, status: "always" },
    apple: { serviceId: "svc_apple", name: "Apple TV+", monthlyPrice: 4.99, status: "paused" },
};

export default function Dashboard(): JSX.Element {
    const [recommended, setRecommended] = useState<Show[]>([]);
    const [services, setServices] = useState<string[]>([]);
    const [targetBudget, setTargetBudget] = useState<number | null>(null);

    useEffect(() => {
        try {
            const rec = localStorage.getItem("streamwise_recommendations");
            if (rec) {
                setRecommended(JSON.parse(rec));
            } else {
                const defaultServiceIds = ["netflix", "max", "hulu", "apple"];
                const svcObjs = defaultServiceIds.map(id => SERVICE_CATALOG[id as keyof typeof SERVICE_CATALOG]);
                const user = { id: "anon", name: "You", targetBudget: 0, genres: ["Crime"], bingeTolerance: 3 } as any;
                const recs = recommendShows(user, svcObjs as any, mockShows as any, 6);
                setRecommended(recs);
            }

            const svcRaw = localStorage.getItem("streamwise_user_services");
            const svc = svcRaw ? JSON.parse(svcRaw) as string[] : [];
            setServices(svc.length ? svc : ["netflix", "max"]);

            const tb = localStorage.getItem("streamwise_user_targetBudget");
            if (tb === null) setTargetBudget(null);
            else if (tb === "null") setTargetBudget(null);
            else setTargetBudget(Number(tb));
        } catch (e) {
            setRecommended([]);
            setServices(["netflix", "max"]);
            setTargetBudget(null);
        }
    }, []);

    const serviceObjs = services.map(id => SERVICE_CATALOG[id as keyof typeof SERVICE_CATALOG] ?? { serviceId: `svc_${id}`, name: id, monthlyPrice: 0, status: "paused" });
    const total = serviceObjs.reduce((s, x) => s + (x.monthlyPrice ?? 0), 0);

    return (
        <div className="min-h-screen p-6 bg-zinc-50 text-zinc-900 font-sans dark:bg-black">
            <main className="mx-auto max-w-4xl pb-6">
                <header className="mb-8 py-12">
                    <h1 className="text-3xl font-semibold dark:text-zinc-50">Your Dashboard</h1>
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">Selected services: {serviceObjs.map(s => s.name).join(", ")} • Target ${targetBudget ?? "—"}</p>
                </header>

                <section className="mb-8">
                    <h2 className="text-xl font-medium mb-4 dark:text-zinc-50">Your Services</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {serviceObjs.map((svc) => (
                            <div key={svc.serviceId} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">{svc.name}</h3>
                                        <p className="text-sm text-zinc-500">${(svc.monthlyPrice ?? 0).toFixed(2)} / month</p>
                                    </div>
                                    <div className="text-sm font-medium text-zinc-700">{svc.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-medium mb-4 dark:text-zinc-50">What to Watch</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {recommended.map((show) => (
                            <div key={show.showId} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="w-28 shrink-0">
                                        <Image src={show.imageSet?.verticalPoster?.w360 ?? "/vertical-poster.svg"} width={112} height={168} alt={`${show.title} poster`} className="rounded-sm object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold">{show.title}</h3>
                                        <p className="text-sm text-zinc-500">{show.year} • {show.genres.join(", ")}</p>
                                        <p className="mt-2 text-sm text-zinc-600">{show.overview ?? "No overview available."}</p>
                                        {show.actors && show.actors.length > 0 && (
                                            <p className="mt-2 text-sm text-zinc-500">Starring: {show.actors.slice(0, 2).join(", ")}</p>
                                        )}
                                        <div className="mt-3 text-sm text-zinc-500 flex items-center justify-between">
                                            <span>{show.serviceId.replace("svc_", "")}</span>
                                            <span>pop {show.popularity}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
