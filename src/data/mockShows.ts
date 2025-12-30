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

const rawShows: Omit<Show, 'imageSet'>[] = [
    // Netflix (svc_netflix)
    { showId: "n1", title: "Midnight Misfits", year: 2019, genres: ["Comedy", "Adventure"], serviceId: "svc_netflix", popularity: 78, overview: "A ragtag crew stumbles into treasure and trouble.", actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n2", title: "Concrete Rodeo", year: 2021, genres: ["Western", "Comedy"], serviceId: "svc_netflix", popularity: 71, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n3", title: "Treasure Trail", year: 2018, genres: ["Adventure", "Comedy"], serviceId: "svc_netflix", popularity: 66, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n4", title: "Outlaw Borough", year: 2020, genres: ["Western", "Action"], serviceId: "svc_netflix", popularity: 69, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n5", title: "Shady Camp", year: 2017, genres: ["Comedy", "Adventure"], serviceId: "svc_netflix", popularity: 63, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n6", title: "Broken Spur", year: 2022, genres: ["Western", "Drama"], serviceId: "svc_netflix", popularity: 74, actors: ["Sam Carter", "Alex Morgan"] },
    { showId: "n7", title: "Undercover Hearts", year: 2016, genres: ["Drama", "Crime"], serviceId: "svc_netflix", popularity: 55 },
    { showId: "n8", title: "The Long Night", year: 2023, genres: ["Crime", "Thriller"], serviceId: "svc_netflix", popularity: 88 },
    { showId: "n9", title: "Detective Duo", year: 2015, genres: ["Crime", "Comedy"], serviceId: "svc_netflix", popularity: 50 },
    { showId: "n10", title: "Paper Trails", year: 2020, genres: ["Drama", "Crime"], serviceId: "svc_netflix", popularity: 65 },
    { showId: "n11", title: "Night Watch", year: 2014, genres: ["Crime", "Horror"], serviceId: "svc_netflix", popularity: 45 },
    { showId: "n12", title: "Final Verdict", year: 2019, genres: ["Crime", "Legal"], serviceId: "svc_netflix", popularity: 58 },

    // Max (svc_max)
    { showId: "m1", title: "Heist & High Jinks", year: 2022, genres: ["Comedy", "Adventure"], serviceId: "svc_max", popularity: 79, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m2", title: "Midnight Vaqueros", year: 2018, genres: ["Western", "Comedy"], serviceId: "svc_max", popularity: 72, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m3", title: "Border Run", year: 2017, genres: ["Adventure", "Action"], serviceId: "svc_max", popularity: 67, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m4", title: "City Treasure", year: 2016, genres: ["Adventure", "Comedy"], serviceId: "svc_max", popularity: 61, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m5", title: "Rodeo Nights", year: 2020, genres: ["Western", "Drama"], serviceId: "svc_max", popularity: 74, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m6", title: "Blue Horizon", year: 2019, genres: ["Comedy", "Adventure"], serviceId: "svc_max", popularity: 55, actors: ["Jordan Miles", "Riley Stone"] },
    { showId: "m7", title: "The Informant", year: 2021, genres: ["Crime", "Mystery"], serviceId: "svc_max", popularity: 70 },
    { showId: "m8", title: "Cold Streets", year: 2015, genres: ["Crime", "Documentary"], serviceId: "svc_max", popularity: 40 },
    { showId: "m9", title: "Undercover", year: 2013, genres: ["Crime", "Drama"], serviceId: "svc_max", popularity: 48 },
    { showId: "m10", title: "Hidden Evidence", year: 2014, genres: ["Crime", "Mystery"], serviceId: "svc_max", popularity: 52 },
    { showId: "m11", title: "The Prosecutor", year: 2018, genres: ["Crime", "Legal"], serviceId: "svc_max", popularity: 60 },
    { showId: "m12", title: "Late Confessions", year: 2021, genres: ["Crime", "Drama"], serviceId: "svc_max", popularity: 67 },

    // Hulu (svc_hulu)
    { showId: "h1", title: "Tiny Town Follies", year: 2016, genres: ["Comedy", "Western"], serviceId: "svc_hulu", popularity: 56, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h2", title: "Watchtower Adventures", year: 2019, genres: ["Adventure", "Comedy"], serviceId: "svc_hulu", popularity: 62, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h3", title: "Cold River Run", year: 2017, genres: ["Adventure", "Drama"], serviceId: "svc_hulu", popularity: 50, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h4", title: "Hidden Homestead", year: 2020, genres: ["Western", "Thriller"], serviceId: "svc_hulu", popularity: 70, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h5", title: "Stake and Saddle", year: 2015, genres: ["Western", "Comedy"], serviceId: "svc_hulu", popularity: 47, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h6", title: "Broken Compass", year: 2022, genres: ["Adventure", "Comedy"], serviceId: "svc_hulu", popularity: 68, actors: ["Taylor Grey", "Casey North"] },
    { showId: "h7", title: "Courtroom Drama", year: 2014, genres: ["Legal", "Crime"], serviceId: "svc_hulu", popularity: 44 },
    { showId: "h8", title: "The Stake", year: 2018, genres: ["Crime", "Thriller"], serviceId: "svc_hulu", popularity: 53 },
    { showId: "h9", title: "Night Prowler", year: 2013, genres: ["Crime", "Horror"], serviceId: "svc_hulu", popularity: 39 },
    { showId: "h10", title: "Missing Pieces", year: 2021, genres: ["Crime", "Mystery"], serviceId: "svc_hulu", popularity: 65 },
    { showId: "h11", title: "Street Smarts", year: 2012, genres: ["Crime", "Comedy"], serviceId: "svc_hulu", popularity: 35 },
    { showId: "h12", title: "Final Witness", year: 2016, genres: ["Crime", "Drama"], serviceId: "svc_hulu", popularity: 50 },

    // Apple TV+ (svc_apple)
    { showId: "a1", title: "Quiet Trails", year: 2020, genres: ["Adventure", "Comedy"], serviceId: "svc_apple", popularity: 60, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a2", title: "The Gentle Outlaw", year: 2019, genres: ["Western", "Drama"], serviceId: "svc_apple", popularity: 63, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a3", title: "Close Calls & Capers", year: 2021, genres: ["Comedy", "Adventure"], serviceId: "svc_apple", popularity: 58, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a4", title: "Hidden Passages", year: 2018, genres: ["Adventure", "Drama"], serviceId: "svc_apple", popularity: 54, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a5", title: "Evidence of Laughter", year: 2017, genres: ["Comedy", "Mystery"], serviceId: "svc_apple", popularity: 46, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a6", title: "Watcher on the Range", year: 2015, genres: ["Western", "Comedy"], serviceId: "svc_apple", popularity: 43, actors: ["Morgan Lane", "Avery Cole"] },
    { showId: "a7", title: "City Limits", year: 2016, genres: ["Drama", "Crime"], serviceId: "svc_apple", popularity: 48 },
    { showId: "a8", title: "The Long Con", year: 2022, genres: ["Crime", "Drama"], serviceId: "svc_apple", popularity: 72 },
    { showId: "a9", title: "Quiet Witness", year: 2014, genres: ["Crime", "Legal"], serviceId: "svc_apple", popularity: 41 },
    { showId: "a10", title: "Line of Duty", year: 2013, genres: ["Crime", "Action"], serviceId: "svc_apple", popularity: 38 },
    { showId: "a11", title: "After Hours", year: 2018, genres: ["Crime", "Thriller"], serviceId: "svc_apple", popularity: 56 },
    { showId: "a12", title: "Cold Blood", year: 2019, genres: ["Crime", "Mystery"], serviceId: "svc_apple", popularity: 66 },
];

export const mockShows: Show[] = rawShows.map((s) => {
    const serviceKey = s.serviceId.replace("svc_", "");
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
        overview: (s as any).overview ?? (s as any).synopsis ?? "",
        actors: (s as any).actors ?? ["Unknown", "Unknown"],
        imageSet: {
            verticalPoster: {
                w360: "/vertical-poster.svg",
            },
        },
        streamingOptions: {
            us: [usEntry],
        },
    } as Show;
});

export default mockShows;
