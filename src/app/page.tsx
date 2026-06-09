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
            <main className="w-full max-w-2xl rounded-lg bg-white p-12 text-center shadow-md">
                <h1 className="text-4xl font-semibold mb-4">Watch with confidence.</h1>
                <p className="text-zinc-600 mb-8">Streamwise helps you choose the right streaming services each month—so you never miss what matters or waste money.</p>

                <Link href="/onboarding/1" className="inline-block w-full rounded-md bg-zinc-900 text-white py-3 font-medium hover:opacity-95">
                    Get started
                </Link>

                <p className="text-sm text-zinc-500 mt-4">No logins. No credit cards.</p>
            </main>
        </div>
    );
}
