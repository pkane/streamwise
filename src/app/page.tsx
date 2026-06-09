"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Page() {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        try {
            if (localStorage.getItem("streamwise_onboarding_complete") === "1") {
                router.replace("/dashboard");
                return;
            }
        } catch { /* ignore */ }
        setChecked(true);
    }, [router]);

    if (!checked) return null;

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 dark:bg-black">
            <main className="w-full max-w-2xl">
                <img src="/sw-badge.svg" alt="Streamwise" className="w-24 h-24 mb-6 mx-auto" />
                <h1 className="text-6xl font-semibold font-display mb-6 text-center mb-8">Stream<span className="italic">wise</span>.</h1>
                <div className="rounded-lg bg-white py-6 px-12 text-center shadow-md">
                    <p className="text-xl font-display mb-3 tracking-tight">Watch with confidence.</p>
                    <p className="text-zinc-600 mb-8">Streamwise helps you choose the right streaming services each month—so you never miss what matters or waste money.</p>

                    <Link href="/onboarding/1" className="inline-block w-full rounded-md bg-zinc-900 text-white py-3 font-medium hover:opacity-95">
                        Get started
                    </Link>

                    <p className="text-sm text-zinc-500 mt-4">No logins. No credit cards.</p>
                </div>
            </main>
        </div>
    );
}
