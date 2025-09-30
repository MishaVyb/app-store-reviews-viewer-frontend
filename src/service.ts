export type App = {
  id: number;
};

export type Review = {
  id: string;
  appId: number;
  title: string;
  content: string;
  author: string;
  score: number;
  updated: string;
};

export type GetAppsResponse = {
  items: App[];
};

export type GetReviewsResponse = {
  items: Review[];
};

export type ValidationError = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

export type HTTPValidationError = {
  detail: ValidationError[];
};

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Generic fetch wrapper with error handling
async function apiRequest<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 422) {
        const errorData: HTTPValidationError = await response.json();
        throw new Error(
          `Validation Error: ${errorData.detail.map((e) => e.msg).join(", ")}`
        );
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
}

/**
 * Get all apps from the App Store
 * @returns Promise<GetAppsResponse> - List of apps
 */
export async function getApps(): Promise<GetAppsResponse> {
  return apiRequest<GetAppsResponse>("/api/apps");
}

/**
 * Get reviews for a specific app
 * @param appId - The AppStore Application ID
 * @returns Promise<GetReviewsResponse> - List of reviews for the app
 */
export async function getReviews(appId: number): Promise<GetReviewsResponse> {
  return apiRequest<GetReviewsResponse>(`/api/reviews/${appId}`);
}

