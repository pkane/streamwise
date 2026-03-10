import { describe, it, expect } from "vitest";
import { optimizeServices, recommendShows, recommendNextWatch } from "./index";
import type { UserProfile, UserService, Show } from "../../models/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
        id: "u1",
        name: "Test",
        targetBudget: null,
        genres: ["crime"],
        bingeTolerance: 3,
        services: [],
        ...overrides,
    };
}

function makeService(
    serviceId: string,
    monthlyPrice: number,
    status: "active" | "paused" | "always" = "active"
): UserService {
    return { serviceId, name: serviceId, monthlyPrice, status };
}

function makeShow(
    showId: string,
    serviceId: string,
    genres: string[] = ["crime"],
    popularity = 85
): Show {
    return { showId, title: showId, serviceId, genres, popularity };
}

// ---------------------------------------------------------------------------
// optimizeServices
// ---------------------------------------------------------------------------

describe("optimizeServices", () => {
    const baseOptions = {
        showSignals: {},
        releasePreference: "mixed" as const,
        targetBudget: null,
        serviceStatuses: {},
    };

    it("always-keep services are never deactivated", () => {
        const services = [
            makeService("hulu", 7.99, "always"),
            makeService("netflix", 15.49, "active"),
        ];
        const pool = [makeShow("s1", "hulu"), makeShow("s2", "netflix")];
        const user = makeUser({ targetBudget: 0 }); // $0 budget — nothing new should activate

        const result = optimizeServices(user, services, pool, { ...baseOptions, targetBudget: 0 });

        const hulu = result.services.find((s) => s.serviceId === "hulu");
        expect(hulu?.recommendedStatus).toBe("always");
    });

    it("activates services with content up to budget", () => {
        // $50 budget: Hulu(always $7.99) + Netflix($15.49) + Max($9.99) = $33.47 — all should fit
        const services = [
            makeService("hulu", 7.99, "always"),
            makeService("netflix", 15.49),
            makeService("hbo", 9.99),
        ];
        const pool = [
            makeShow("s1", "hulu"),
            makeShow("s2", "netflix"),
            makeShow("s3", "hbo"),
        ];
        const user = makeUser({ targetBudget: 50 });

        const result = optimizeServices(user, services, pool, { ...baseOptions, targetBudget: 50 });

        const statuses = Object.fromEntries(result.services.map((s) => [s.serviceId, s.recommendedStatus]));
        expect(statuses["hulu"]).toBe("always");
        expect(statuses["netflix"]).toBe("active");
        expect(statuses["hbo"]).toBe("active");
    });

    it("does not activate services that exceed budget", () => {
        // $10 budget: Hulu(always $7.99) leaves $2.01 — not enough for Netflix($15.49)
        const services = [
            makeService("hulu", 7.99, "always"),
            makeService("netflix", 15.49),
        ];
        const pool = [makeShow("s1", "hulu"), makeShow("s2", "netflix")];
        const user = makeUser({ targetBudget: 10 });

        const result = optimizeServices(user, services, pool, { ...baseOptions, targetBudget: 10 });

        const netflix = result.services.find((s) => s.serviceId === "netflix");
        expect(netflix?.recommendedStatus).toBe("paused");
        expect(result.totalMonthlyCost).toBeLessThanOrEqual(10);
    });

    it("excludes services with no shows from results", () => {
        const services = [
            makeService("hulu", 7.99, "always"),
            makeService("netflix", 15.49),
            makeService("disney", 7.99), // no shows in pool
        ];
        const pool = [makeShow("s1", "hulu"), makeShow("s2", "netflix")];
        const user = makeUser();

        const result = optimizeServices(user, services, pool, baseOptions);

        const serviceIds = result.services.map((s) => s.serviceId);
        expect(serviceIds).not.toContain("disney");
    });

    it("only returns shows from active/always services", () => {
        const services = [
            makeService("hulu", 7.99, "always"),
            makeService("netflix", 15.49),
        ];
        const pool = [makeShow("s1", "hulu"), makeShow("s2", "netflix")];
        const user = makeUser({ targetBudget: 50 });

        const result = optimizeServices(user, services, pool, { ...baseOptions, targetBudget: 50 });

        const activeIds = new Set(
            result.services
                .filter((s) => s.recommendedStatus === "active" || s.recommendedStatus === "always")
                .map((s) => s.serviceId)
        );
        for (const show of result.shows) {
            expect(activeIds.has(show.serviceId)).toBe(true);
        }
    });

    it("no shows from non-active services appear (regression: nonActiveShows removed)", () => {
        // Hulu is always-keep but has NO shows in pool; Netflix/Max are paused (over budget).
        // Result should have no shows — not non-active Netflix/Max shows.
        const services = [
            makeService("hulu", 7.99, "always"),
            makeService("netflix", 15.49),
        ];
        const pool = [makeShow("s1", "netflix")]; // Hulu has nothing
        const user = makeUser({ targetBudget: 8 }); // Only $0.01 left after Hulu — Netflix can't activate

        const result = optimizeServices(user, services, pool, { ...baseOptions, targetBudget: 8 });

        const netflix = result.services.find((s) => s.serviceId === "netflix");
        expect(netflix?.recommendedStatus).toBe("paused");
        // No Netflix shows should appear
        expect(result.shows.filter((s) => s.serviceId === "netflix")).toHaveLength(0);
    });

    it("swaps a lower-value service for a higher-value one when budget is tight", () => {
        // Budget: $20. ServiceA($15, 1 show, score 50) vs ServiceB($12, 3 shows, score 150)
        // ServiceA activates first (sorted by valueRatio, but let's force the scenario).
        // Actually let's use explicit shows to control scores.
        const services = [
            makeService("svcA", 15),
            makeService("svcB", 12),
        ];
        // svcB has higher total score → higher valueRatio
        const pool = [
            makeShow("a1", "svcA", ["crime"], 40), // score ~40
            makeShow("b1", "svcB", ["crime"], 90), // score ~100 (genre+pop)
            makeShow("b2", "svcB", ["crime"], 90),
            makeShow("b3", "svcB", ["crime"], 90),
        ];

        const result = optimizeServices(makeUser(), services, pool, { ...baseOptions, targetBudget: 20 });

        // svcB has much better valueRatio — it should win the swap
        const svcB = result.services.find((s) => s.serviceId === "svcB");
        expect(svcB?.recommendedStatus).toBe("active");
    });

    it("with no budget limit, activates all services that have shows", () => {
        const services = [
            makeService("netflix", 15.49),
            makeService("hbo", 9.99),
            makeService("hulu", 7.99),
        ];
        const pool = [
            makeShow("s1", "netflix"),
            makeShow("s2", "hbo"),
            makeShow("s3", "hulu"),
        ];

        const result = optimizeServices(makeUser(), services, pool, baseOptions);

        for (const svc of result.services) {
            expect(svc.recommendedStatus).toBe("active");
        }
    });

    it("filters shows marked seen or skip", () => {
        const services = [makeService("netflix", 15.49)];
        const pool = [
            makeShow("seen-show", "netflix"),
            makeShow("skip-show", "netflix"),
            makeShow("good-show", "netflix"),
        ];

        const result = optimizeServices(makeUser(), services, pool, {
            ...baseOptions,
            showSignals: { "seen-show": "seen", "skip-show": "skip" },
        });

        const showIds = result.shows.map((s) => s.showId);
        expect(showIds).not.toContain("seen-show");
        expect(showIds).not.toContain("skip-show");
        expect(showIds).toContain("good-show");
    });
});

// ---------------------------------------------------------------------------
// recommendShows
// ---------------------------------------------------------------------------

describe("recommendShows", () => {
    it("returns empty array when pool is empty", () => {
        expect(recommendShows(makeUser(), [], [])).toEqual([]);
    });

    it("ranks shows by genre match", () => {
        const user = makeUser({ genres: ["crime"] });
        const services = [makeService("netflix", 15.49)];
        const pool = [
            makeShow("crime-show", "netflix", ["crime"], 50),
            makeShow("comedy-show", "netflix", ["comedy"], 50),
        ];

        const result = recommendShows(user, services, pool, 10);
        expect(result[0].showId).toBe("crime-show");
    });

    it("boosts shows from always-status services", () => {
        const user = makeUser({ genres: [] }); // no genre preference — only service status matters
        const services = [
            makeService("hulu", 7.99, "always"),
            makeService("netflix", 15.49, "active"),
        ];
        const pool = [
            makeShow("hulu-show", "hulu", [], 80),
            makeShow("netflix-show", "netflix", [], 80),
        ];

        const result = recommendShows(user, services, pool, 10);
        expect(result[0].showId).toBe("hulu-show");
    });

    it("respects the limit parameter", () => {
        const services = [makeService("netflix", 15.49)];
        const pool = Array.from({ length: 20 }, (_, i) => makeShow(`s${i}`, "netflix"));

        const result = recommendShows(makeUser(), services, pool, 5);
        expect(result).toHaveLength(5);
    });
});

// ---------------------------------------------------------------------------
// recommendNextWatch
// ---------------------------------------------------------------------------

describe("recommendNextWatch", () => {
    const baseOptions = {
        showSignals: {},
        releasePreference: "mixed" as const,
        targetBudget: null,
        serviceStatuses: {},
    };

    it("excludes seen and skip shows", () => {
        const user = makeUser();
        const services = [makeService("netflix", 15.49)];
        const pool = [
            makeShow("seen", "netflix"),
            makeShow("skip", "netflix"),
            makeShow("want", "netflix"),
        ];

        const result = recommendNextWatch(user, services, pool, {
            ...baseOptions,
            showSignals: { seen: "seen", skip: "skip", want: "want" },
        });

        const ids = result.map((s) => s.showId);
        expect(ids).not.toContain("seen");
        expect(ids).not.toContain("skip");
        expect(ids).toContain("want");
    });

    it("boosts want shows to the top", () => {
        const user = makeUser({ genres: ["crime"] });
        const services = [makeService("netflix", 15.49)];
        const pool = [
            makeShow("high-pop", "netflix", ["crime"], 99),
            makeShow("want-show", "netflix", ["crime"], 50),
        ];

        const result = recommendNextWatch(user, services, pool, {
            ...baseOptions,
            showSignals: { "want-show": "want" },
        });

        expect(result[0].showId).toBe("want-show");
    });

    it("restricts to active services when budget is exhausted", () => {
        // activeCost = netflix $15.49, budget = $10 → hasBudgetRoom = false
        const user = makeUser();
        const services = [
            makeService("netflix", 15.49, "active"),
            makeService("hbo", 9.99, "paused"),
        ];
        const pool = [
            makeShow("netflix-show", "netflix"),
            makeShow("hbo-show", "hbo"),
        ];

        const result = recommendNextWatch(user, services, pool, {
            ...baseOptions,
            targetBudget: 10,
            serviceStatuses: { netflix: "active", hbo: "paused" },
        });

        const ids = result.map((s) => s.showId);
        expect(ids).toContain("netflix-show");
        expect(ids).not.toContain("hbo-show");
    });
});
