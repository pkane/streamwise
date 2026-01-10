// src/data/mockShows.ts
// Mock dataset of shows — roughly a dozen shows per service.
// This is inspired by typical streaming catalog fields (see MovieOfTheNight API shape).
// TODO: Replace with real provider catalogs or cached API responses.

import type { Show } from "../models/types";

const SERVICE_META: Record<string, { id: string; name: string; homePage: string; themeColorCode: string }> = {
    netflix: { id: "netflix", name: "Netflix", homePage: "https://www.netflix.com/", themeColorCode: "#E50914" },
    max: { id: "max", name: "Max", homePage: "https://www.hbomax.com/", themeColorCode: "#0b3b66" },
    hulu: { id: "hulu", name: "Hulu", homePage: "https://www.hulu.com/", themeColorCode: "#1ce783" },
    apple: { id: "apple", name: "Apple TV+", homePage: "https://tv.apple.com/", themeColorCode: "#000000" },
    prime: { id: "prime", name: "Prime Video", homePage: "https://www.primevideo.com/", themeColorCode: "#00A8E1" },
};

// Use lowercase genre IDs to match the streaming-availability API format
const rawShows: Omit<Show, 'imageSet'>[] = [
    // Netflix (netflix)
    { showId: "n1", title: "Midnight Misfits", year: 2019, genres: ["comedy", "adventure"], serviceId: "netflix", popularity: 78, overview: "A ragtag crew stumbles into treasure and trouble.", actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n2", title: "Concrete Rodeo", year: 2021, genres: ["western", "comedy"], serviceId: "netflix", popularity: 71, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n3", title: "Treasure Trail", year: 2018, genres: ["adventure", "comedy"], serviceId: "netflix", popularity: 66, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n4", title: "Outlaw Borough", year: 2020, genres: ["western", "action"], serviceId: "netflix", popularity: 69, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n5", title: "Shady Camp", year: 2017, genres: ["comedy", "adventure"], serviceId: "netflix", popularity: 63, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n6", title: "Broken Spur", year: 2022, genres: ["western", "drama"], serviceId: "netflix", popularity: 74, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n7", title: "Undercover Hearts", year: 2016, genres: ["drama", "crime"], serviceId: "netflix", popularity: 55 },
    { showId: "n8", title: "The Long Night", year: 2023, genres: ["crime", "thriller"], serviceId: "netflix", popularity: 88 },
    { showId: "n9", title: "Detective Duo", year: 2015, genres: ["crime", "comedy"], serviceId: "netflix", popularity: 50 },
    { showId: "n10", title: "Paper Trails", year: 2020, genres: ["drama", "crime"], serviceId: "netflix", popularity: 65 },
    { showId: "n11", title: "Night Watch", year: 2014, genres: ["crime", "horror"], serviceId: "netflix", popularity: 45 },
    { showId: "n12", title: "Final Verdict", year: 2019, genres: ["crime", "drama"], serviceId: "netflix", popularity: 58 },

    // Max (max)
    { showId: "m1", title: "Heist & High Jinks", year: 2022, genres: ["comedy", "adventure"], serviceId: "max", popularity: 79, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m2", title: "Midnight Vaqueros", year: 2018, genres: ["western", "comedy"], serviceId: "max", popularity: 72, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m3", title: "Border Run", year: 2017, genres: ["adventure", "action"], serviceId: "max", popularity: 67, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m4", title: "City Treasure", year: 2016, genres: ["adventure", "comedy"], serviceId: "max", popularity: 61, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m5", title: "Rodeo Nights", year: 2020, genres: ["western", "drama"], serviceId: "max", popularity: 74, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m6", title: "Blue Horizon", year: 2019, genres: ["comedy", "adventure"], serviceId: "max", popularity: 55, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m7", title: "The Informant", year: 2021, genres: ["crime", "mystery"], serviceId: "max", popularity: 70 },
    { showId: "m8", title: "Cold Streets", year: 2015, genres: ["crime", "documentary"], serviceId: "max", popularity: 40 },
    { showId: "m9", title: "Undercover", year: 2013, genres: ["crime", "drama"], serviceId: "max", popularity: 48 },
    { showId: "m10", title: "Hidden Evidence", year: 2014, genres: ["crime", "mystery"], serviceId: "max", popularity: 52 },
    { showId: "m11", title: "The Prosecutor", year: 2018, genres: ["crime", "drama"], serviceId: "max", popularity: 60 },
    { showId: "m12", title: "Late Confessions", year: 2021, genres: ["crime", "drama"], serviceId: "max", popularity: 67 },

    // Hulu (hulu)
    { showId: "h1", title: "Tiny Town Follies", year: 2016, genres: ["comedy", "western"], serviceId: "hulu", popularity: 56, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h2", title: "Watchtower Adventures", year: 2019, genres: ["adventure", "comedy"], serviceId: "hulu", popularity: 62, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h3", title: "Cold River Run", year: 2017, genres: ["adventure", "drama"], serviceId: "hulu", popularity: 50, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h4", title: "Hidden Homestead", year: 2020, genres: ["western", "thriller"], serviceId: "hulu", popularity: 70, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h5", title: "Stake and Saddle", year: 2015, genres: ["western", "comedy"], serviceId: "hulu", popularity: 47, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h6", title: "Broken Compass", year: 2022, genres: ["adventure", "comedy"], serviceId: "hulu", popularity: 68, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h7", title: "Courtroom Drama", year: 2014, genres: ["drama", "crime"], serviceId: "hulu", popularity: 44 },
    { showId: "h8", title: "The Stake", year: 2018, genres: ["crime", "thriller"], serviceId: "hulu", popularity: 53 },
    { showId: "h9", title: "Night Prowler", year: 2013, genres: ["crime", "horror"], serviceId: "hulu", popularity: 39 },
    { showId: "h10", title: "Missing Pieces", year: 2021, genres: ["crime", "mystery"], serviceId: "hulu", popularity: 65 },
    { showId: "h11", title: "Street Smarts", year: 2012, genres: ["crime", "comedy"], serviceId: "hulu", popularity: 35 },
    { showId: "h12", title: "Final Witness", year: 2016, genres: ["crime", "drama"], serviceId: "hulu", popularity: 50 },

    // Apple TV+ (apple)
    { showId: "a1", title: "Quiet Trails", year: 2020, genres: ["adventure", "comedy"], serviceId: "apple", popularity: 60, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a2", title: "The Gentle Outlaw", year: 2019, genres: ["western", "drama"], serviceId: "apple", popularity: 63, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a3", title: "Close Calls & Capers", year: 2021, genres: ["comedy", "adventure"], serviceId: "apple", popularity: 58, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a4", title: "Hidden Passages", year: 2018, genres: ["adventure", "drama"], serviceId: "apple", popularity: 54, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a5", title: "Evidence of Laughter", year: 2017, genres: ["comedy", "mystery"], serviceId: "apple", popularity: 46, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a6", title: "Watcher on the Range", year: 2015, genres: ["western", "comedy"], serviceId: "apple", popularity: 43, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a7", title: "City Limits", year: 2016, genres: ["drama", "crime"], serviceId: "apple", popularity: 48 },
    { showId: "a8", title: "The Long Con", year: 2022, genres: ["crime", "drama"], serviceId: "apple", popularity: 72 },
    { showId: "a9", title: "Quiet Witness", year: 2014, genres: ["crime", "drama"], serviceId: "apple", popularity: 41 },
    { showId: "a10", title: "Line of Duty", year: 2013, genres: ["crime", "action"], serviceId: "apple", popularity: 38 },
    { showId: "a11", title: "After Hours", year: 2018, genres: ["crime", "thriller"], serviceId: "apple", popularity: 56 },
    { showId: "a12", title: "Cold Blood", year: 2019, genres: ["crime", "mystery"], serviceId: "apple", popularity: 66 },
];

export const mockShows: Show[] = rawShows.map((s) => {
    const serviceKey = s.serviceId;
    const meta = SERVICE_META[serviceKey] ?? { id: serviceKey, name: serviceKey, homePage: `https://${serviceKey}.example/`, themeColorCode: "#888888" };
    const usEntry = {
        service: {
            id: meta.id,
            name: meta.name,
            homePage: meta.homePage,
            themeColorCode: meta.themeColorCode,
            imageSet: {},
        },
        type: "subscription",
        link: `https://${meta.id}.example/title/${s.showId}`,
        videoLink: `https://${meta.id}.example/watch/${s.showId}`,
        quality: "hd",
        audios: [{ language: "eng" }],
        subtitles: [],
        expiresSoon: false,
        availableSince: 1730000000,
    };

    return {
        ...s,
        overview: s.overview ?? "",
        actors: s.actors ?? [],
        imageSet: {
            // Match the VerticalImage type from streaming-availability
            verticalPoster: {
                w240: "/vertical-poster.svg",
                w360: "/vertical-poster.svg",
                w480: "/vertical-poster.svg",
                w600: "/vertical-poster.svg",
                w720: "/vertical-poster.svg",
            },
        },
        streamingOptions: {
            us: [usEntry],
        },
    } as Show;
});

export default mockShows;
