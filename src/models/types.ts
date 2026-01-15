// src/models/types.ts
// TypeScript interfaces used across Streamwise.
// Keep these minimal for the initial prototype; expand as needed.

// Re-export the API types we use directly
import type {
    Show as ApiShow,
    Genre as ApiGenre,
    ShowImageSet as ApiShowImageSet,
    VerticalImage,
    HorizontalImage,
} from "streaming-availability";

export type { ApiShow, ApiGenre, ApiShowImageSet, VerticalImage, HorizontalImage };

// Internal genre representation - just the id string for simplicity
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
// This mirrors the API's ShowImageSet but with optional fields for flexibility
export interface ImageSet {
    verticalPoster?: VerticalImage;
    horizontalPoster?: HorizontalImage;
    verticalBackdrop?: VerticalImage;
    horizontalBackdrop?: HorizontalImage;
}

// Internal Show representation compatible with both API data and mock data
export interface Show {
    showId: string;        // mapped from API's `id`
    title: string;
    year?: number;         // mapped from API's `releaseYear` or `firstAirYear`
    genres: Genre[];       // mapped from API's Genre[] objects to just id strings
    serviceId: string;     // derived from streamingOptions - first available service
    popularity?: number;   // 0..100, derived from API's `rating` (scaled)
    overview?: string;
    actors?: string[];     // mapped from API's `cast`
    imageSet?: ImageSet;
    streamingOptions?: Record<string, unknown[]>;
}

// Helper to map an API Show to our internal Show format
export function mapApiShowToShow(apiShow: ApiShow, country = "us"): Show {
    // Extract the first service from streamingOptions for serviceId
    const countryOptions = apiShow.streamingOptions?.[country] ?? [];
    const firstService = countryOptions[0]?.service?.id ?? "unknown";

    return {
        showId: apiShow.id,
        title: apiShow.title,
        year: apiShow.releaseYear ?? apiShow.firstAirYear,
        genres: apiShow.genres.map((g) => g.id),
        serviceId: firstService,
        popularity: apiShow.rating ? Math.round(apiShow.rating) : undefined,
        overview: apiShow.overview,
        actors: apiShow.cast?.slice(0, 2),
        imageSet: apiShow.imageSet,
        streamingOptions: apiShow.streamingOptions,
    };
}
