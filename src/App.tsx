import { useState, useEffect, useCallback } from "react";
import { getApps, getReviews, type App, Review } from "./service";

const REFRESH_INTERVAL = 2000;

function App() {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false); // TODO render loader for loadingReviews
  const [error, setError] = useState<string | null>(null);

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
        setError(null);
        const response = await getApps();
        setApps(response.items);

        // Check if there's an appId in the URL and auto-select it
        const urlAppId = getAppIdFromUrl();
        if (urlAppId) {
          setSelectedAppId(urlAppId);
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
      setSelectedAppId(urlAppId);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Fetch reviews when an app is selected
  const fetchReviews = useCallback(async (appId: number) => {
    try {
      setLoadingReviews(true);
      setError(null);
      const response = await getReviews(appId);
      setReviews(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch reviews");
    } finally {
      setLoadingReviews(false);
    }
  }, []);

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
    updateUrl(appId);
  };

  return (
    <div className="App">
      <h1>App Store Reviews Viewer</h1>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {loadingApps && <p>Loading apps...</p>}
      {!loadingApps && apps.length > 0 && (
        <div>
          <h2>Select an App:</h2>
          <select
            value={selectedAppId || ""}
            onChange={(e) => handleAppSelect(Number(e.target.value))}
            style={{ padding: "8px", fontSize: "16px", minWidth: "200px" }}
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

      {selectedAppId && (
        <div style={{ marginTop: "20px" }}>
          <h2>Reviews for App ID: {selectedAppId}</h2>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Reviews are automatically refreshed every {REFRESH_INTERVAL / 1000}{" "}
            seconds
          </p>

          {reviews.length === 0 ? (
            <p>No reviews found for this app.</p>
          ) : (
            <div>
              <p>Found {reviews.length} reviews:</p>
              <div
                style={{
                  maxHeight: "400px",
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
