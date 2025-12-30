// src/models/types.ts
// TypeScript interfaces used across Streamwise.
// Keep these minimal for the initial prototype; expand as needed.

export type Genre = string;

export interface UserProfile {
    id: string;
    name: string;
    targetBudget: number | null;
    genres: Genre[];
    services: UserService[];
    bingeTolerance: number;
    releasePreference?: ReleasePreference;
}

export type ReleasePreference = "weekly" | "binge" | "mixed";

export type ServiceStatus = "active" | "paused" | "always";

export interface UserService {
    serviceId: string;
    name: string;
    monthlyPrice: number;
    status: ServiceStatus;
    relevanceScore?: number;
    valueReason?: string;
}

// Images returned by catalog APIs are often grouped in imageSets with sizes.
export interface ImageSet {
    verticalPoster?: Record<string, string>; // e.g. { w360: url }
    horizontalPoster?: Record<string, string>;
    verticalBackdrop?: Record<string, string>;
    horizontalBackdrop?: Record<string, string>;
}

export interface Show {
    showId: string;
    title: string;
    year?: number;
    genres: Genre[];
    serviceId: string;
    popularity?: number; // 0..100
    overview?: string;
    actors?: string[]; // first two actors (if available)
    imageSet?: ImageSet;
    streamingOptions?: Record<string, any>;
}
