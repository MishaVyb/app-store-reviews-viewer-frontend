import { useState, useEffect, useCallback } from "react";
import { getApps, getReviews, type App, Review } from "./service";

const REFRESH_INTERVAL = 2000;

function App() {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [customAppId, setCustomAppId] = useState<string>("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false); // TODO render loader for loadingReviews
  const [error, setError] = useState<string | null>(null);
  const [reviewFilterDays, setReviewFilterDays] = useState<number>(10); // Default to 10 days

  // Helper functions for URL management
  const getAppIdFromUrl = () => {
    const path = window.location.pathname;
    const match = path.match(/\/app\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const updateUrl = (appId: number | null) => {
    const newPath = appId ? `/app/${appId}` : "/";
    window.history.pushState({}, "", newPath);
  };

  // Fetch apps on component mount and check for appId in URL
  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoadingApps(true);
        const response = await getApps();
        setError(null);
        setApps(response.items);

        // Check if there's an appId in the URL and handle it appropriately
        const urlAppId = getAppIdFromUrl();
        if (urlAppId) {
          // Check if the URL app ID exists in the fetched apps list
          const appExists = response.items.some((app) => app.id === urlAppId);

          if (appExists) {
            // If app exists in the list, select it by default
            setSelectedAppId(urlAppId);
          } else {
            // If app doesn't exist in the list, populate the custom input field
            setCustomAppId(urlAppId.toString());
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch apps");
      } finally {
        setLoadingApps(false);
      }
    };

    fetchApps();
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlAppId = getAppIdFromUrl();
      if (urlAppId) {
        // Check if the URL app ID exists in the current apps list
        const appExists = apps.some((app) => app.id === urlAppId);

        if (appExists) {
          // If app exists in the list, select it
          setSelectedAppId(urlAppId);
          setCustomAppId(""); // Clear custom input
        } else {
          // If app doesn't exist in the list, populate the custom input field
          setCustomAppId(urlAppId.toString());
          setSelectedAppId(null); // Clear selection
        }
      } else {
        // No app ID in URL, clear everything
        setSelectedAppId(null);
        setCustomAppId("");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [apps]);

  // Fetch reviews when an app is selected
  const fetchReviews = useCallback(
    async (appId: number) => {
      try {
        setLoadingReviews(true);
        // Calculate the minimum date from days
        const date = new Date();
        date.setDate(date.getDate() - reviewFilterDays);
        const updatedMin = date.toISOString();

        const response = await getReviews(appId, updatedMin);
        setError(null);
        setReviews(response.items);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch reviews"
        );
      } finally {
        setLoadingReviews(false);
      }
    },
    [reviewFilterDays]
  );

  // Set up interval for fetching reviews every 10 seconds when app is selected
  useEffect(() => {
    if (selectedAppId === null) return;

    // Fetch reviews immediately when app is selected
    fetchReviews(selectedAppId);

    // Set up interval to fetch reviews every 10 seconds
    const interval = setInterval(() => {
      fetchReviews(selectedAppId);
    }, REFRESH_INTERVAL);

    // Cleanup interval on unmount or when selectedAppId changes
    return () => clearInterval(interval);
  }, [selectedAppId, fetchReviews]);

  const handleAppSelect = (appId: number) => {
    setSelectedAppId(appId);
    setCustomAppId(""); // Clear custom input when selecting from dropdown
    updateUrl(appId);
  };

  const handleCustomAppIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const appId = parseInt(customAppId, 10);
    if (!isNaN(appId) && appId > 0) {
      setSelectedAppId(appId);
      setCustomAppId(""); // Clear input after submission
      updateUrl(appId);
    } else {
      setError("Please enter a valid app ID (positive number)");
    }
  };

  if (error) {
    return (
      <div>
        <h1>App Store Reviews Viewer</h1>
        <p style={{ color: "red" }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>App Store Reviews Viewer</h1>

      {loadingApps && <p>Loading apps...</p>}
      {!loadingApps && (
        <div>
          <h2>Select an App:</h2>
          <div style={{
            display: "flex",
            gap: "15px",
            alignItems: "end",
            flexWrap: "wrap",
            marginBottom: "20px"
          }}>
            {apps.length > 0 && (
              <div>
                <label
                  htmlFor="app-select"
                  style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}
                >
                  Choose from available apps:
                </label>
                <select
                  id="app-select"
                  value={selectedAppId || ""}
                  onChange={(e) => handleAppSelect(Number(e.target.value))}
                  style={{
                    padding: "8px",
                    fontSize: "16px",
                    minWidth: "200px",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                  }}
                >
                  <option value="">Choose an app...</option>
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      App ID: {app.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="custom-app-id"
                style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}
              >
                Or enter any App ID:
              </label>
              <form
                onSubmit={handleCustomAppIdSubmit}
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <input
                  id="custom-app-id"
                  type="number"
                  value={customAppId}
                  onChange={(e) => setCustomAppId(e.target.value)}
                  placeholder="Enter App ID (e.g., 123456789)"
                  style={{
                    padding: "8px",
                    fontSize: "16px",
                    minWidth: "200px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    fontSize: "16px",
                    backgroundColor: "#007AFF",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Load Reviews
                </button>
              </form>
            </div>

            <div>
              <label
                htmlFor="review-filter"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                  fontSize: "14px"
                }}
              >
                Show reviews from the last:
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  id="review-filter"
                  type="number"
                  min="1"
                  max="365"
                  value={reviewFilterDays}
                  onChange={(e) =>
                    setReviewFilterDays(parseInt(e.target.value) || 1)
                  }
                  style={{
                    padding: "8px",
                    fontSize: "16px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    width: "80px",
                  }}
                />
                <span style={{ fontSize: "16px" }}>days</span>
                <button
                  onClick={() => setReviewFilterDays(10)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Reset to 10d
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedAppId && (
        <div style={{ marginTop: "20px" }}>
          <h2>Reviews for App ID: {selectedAppId}</h2>

          <p style={{ fontSize: "14px", color: "#666" }}>
            Reviews are automatically refreshed every {REFRESH_INTERVAL / 1000}{" "}
            seconds
          </p>

          {reviews.length === 0 ? (
            <p>
              No reviews found for this app. Try to increase the filter hours or
              another App ID.
            </p>
          ) : (
            <div>
              <p>Found {reviews.length} reviews:</p>
              <div
                style={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  border: "1px solid #ccc",
                  padding: "10px",
                }}
              >
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      marginBottom: "15px",
                      padding: "10px",
                      border: "1px solid #eee",
                      borderRadius: "5px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "5px",
                      }}
                    >
                      <strong>{review.title}</strong>
                      <span style={{ color: "#666" }}>
                        Score: {review.score}
                      </span>
                    </div>
                    <p style={{ margin: "5px 0", fontSize: "14px" }}>
                      {review.content}
                    </p>
                    <div style={{ fontSize: "12px", color: "#888" }}>
                      By: {review.author} | Updated:{" "}
                      {new Date(review.updated).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
