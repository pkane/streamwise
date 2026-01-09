export const DEFAULT_SERVICES = [
    { id: "netflix", serviceId: "netflix", name: "Netflix", monthlyPrice: 15.49, status: "active", relevanceScore: 0.9 },
    { id: "max", serviceId: "max", name: "Max", monthlyPrice: 9.99, status: "paused", relevanceScore: 0.7 },
    { id: "hulu", serviceId: "hulu", name: "Hulu", monthlyPrice: 7.99, status: "always", relevanceScore: 0.5 },
    { id: "apple", serviceId: "apple", name: "Apple TV+", monthlyPrice: 4.99, status: "paused" },
    { id: "prime", serviceId: "prime", name: "Prime Video", monthlyPrice: 8.99, status: "paused" },
    { id: "disney", serviceId: "disney", name: "Disney+", monthlyPrice: 7.99, status: "paused" },
];

// Detailed genre options with ids used by the external API
export const GENRES = [
    { id: "action", name: "Action" },
    { id: "adventure", name: "Adventure" },
    { id: "animation", name: "Animation" },
    { id: "comedy", name: "Comedy" },
    { id: "crime", name: "Crime" },
    { id: "documentary", name: "Documentary" },
    { id: "drama", name: "Drama" },
    { id: "family", name: "Family" },
    { id: "fantasy", name: "Fantasy" },
    { id: "history", name: "History" },
    { id: "horror", name: "Horror" },
    { id: "music", name: "Music" },
    { id: "mystery", name: "Mystery" },
    { id: "news", name: "News" },
    { id: "reality", name: "Reality" },
    { id: "romance", name: "Romance" },
    { id: "scifi", name: "Science Fiction" },
    { id: "talk", name: "Talk Show" },
    { id: "thriller", name: "Thriller" },
    { id: "war", name: "War" },
    { id: "western", name: "Western" },
];

export const BUDGET_OPTIONS: Array<{ id: string; label: string; value: number | null }> = [
    { id: "u50", label: "Under $50", value: 50 },
    { id: "50-75", label: "$50–$75", value: 75 },
    { id: "75-100", label: "$75–$100", value: 100 },
    { id: "100+", label: "$100+", value: 150 },
    { id: "none", label: "I don’t have a budget — just maximize value", value: null },
];

export default {
    DEFAULT_SERVICES,
    GENRES,
    BUDGET_OPTIONS,
};