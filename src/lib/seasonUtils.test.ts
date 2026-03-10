import { describe, it, expect } from "vitest";
import { getSeasonLabel } from "./seasonUtils";
import type { Show } from "../models/types";

function makeShow(overrides: Partial<Show> = {}): Show {
    return {
        showId: "s1",
        title: "Test Show",
        serviceId: "netflix",
        genres: ["crime"],
        ...overrides,
    };
}

function makeStreamingOptions(availableSinceMs: number) {
    return {
        us: [{ type: "subscription", availableSince: Math.floor(availableSinceMs / 1000) }],
    };
}

const NOW = Date.now();
const THREE_MONTHS_AGO = NOW - 90 * 24 * 60 * 60 * 1000;
const SEVEN_MONTHS_AGO = NOW - 210 * 24 * 60 * 60 * 1000;
const CURRENT_YEAR = new Date().getFullYear();

function isoInDays(offsetDays: number) {
    return new Date(NOW + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe("getSeasonLabel", () => {
    it('returns "new" when show is airing this year and option was added within 6 months', () => {
        const show = makeShow({
            lastAirYear: CURRENT_YEAR,
            streamingOptions: makeStreamingOptions(THREE_MONTHS_AGO),
        });
        expect(getSeasonLabel(show)).toBe("new");
    });

    it("returns null for a finished show even if its streaming option is recent (regression)", () => {
        // A show that ended last year was recently added to a service — NOT a new season
        const show = makeShow({
            lastAirYear: CURRENT_YEAR - 1,
            streamingOptions: makeStreamingOptions(THREE_MONTHS_AGO),
        });
        expect(getSeasonLabel(show)).toBeNull();
    });

    it("returns null when show is airing this year but streaming option is older than 6 months", () => {
        const show = makeShow({
            lastAirYear: CURRENT_YEAR,
            streamingOptions: makeStreamingOptions(SEVEN_MONTHS_AGO),
        });
        expect(getSeasonLabel(show)).toBeNull();
    });

    it('returns "soon" when lastAirYear is in the future', () => {
        const show = makeShow({ lastAirYear: CURRENT_YEAR + 1 });
        expect(getSeasonLabel(show)).toBe("soon");
    });

    it('"soon" takes priority when lastAirYear is future, regardless of availableSince', () => {
        const show = makeShow({
            lastAirYear: CURRENT_YEAR + 1,
            streamingOptions: makeStreamingOptions(THREE_MONTHS_AGO),
        });
        expect(getSeasonLabel(show)).toBe("soon");
    });

    it("ignores non-subscription streaming options", () => {
        const show = makeShow({
            lastAirYear: CURRENT_YEAR,
            streamingOptions: {
                us: [{ type: "rent", availableSince: Math.floor(THREE_MONTHS_AGO / 1000) }],
            },
        });
        expect(getSeasonLabel(show)).toBeNull();
    });

    it("returns null when there are no streaming options or lastAirYear", () => {
        expect(getSeasonLabel(makeShow())).toBeNull();
    });

    it('returns "soon" when nextEpisodeAirDate is within 3 months', () => {
        const show = makeShow({ nextEpisodeAirDate: isoInDays(30) });
        expect(getSeasonLabel(show)).toBe("soon");
    });

    it("returns null when nextEpisodeAirDate is more than 3 months away", () => {
        const show = makeShow({ nextEpisodeAirDate: isoInDays(100) });
        expect(getSeasonLabel(show)).toBeNull();
    });

    it("returns null when nextEpisodeAirDate is in the past", () => {
        const show = makeShow({ nextEpisodeAirDate: isoInDays(-1) });
        expect(getSeasonLabel(show)).toBeNull();
    });

    it("nextEpisodeAirDate takes priority over lastAirYear fallback", () => {
        // Has a precise date within window — returns "soon" regardless of lastAirYear
        const show = makeShow({ nextEpisodeAirDate: isoInDays(30), lastAirYear: CURRENT_YEAR + 1 });
        expect(getSeasonLabel(show)).toBe("soon");
    });

    it("only checks the requested country", () => {
        const show = makeShow({
            lastAirYear: CURRENT_YEAR,
            streamingOptions: {
                gb: [{ type: "subscription", availableSince: Math.floor(THREE_MONTHS_AGO / 1000) }],
            },
        });
        expect(getSeasonLabel(show, "us")).toBeNull();
        expect(getSeasonLabel(show, "gb")).toBe("new");
    });
});
