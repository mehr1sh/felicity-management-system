import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

export function Organizers() {
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(new Set());

  useEffect(() => {
    loadOrganizers();
    if (user?.role === "participant") {
      loadFollowed();
    }
  }, []);

  const loadOrganizers = async () => {
    try {
      const res = await api.get("/organizers");
      setOrganizers(res.data.organizers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowed = async () => {
    try {
      const res = await api.get("/me");
      if (res.data.user.followedOrganizers) {
        setFollowed(new Set(res.data.user.followedOrganizers.map((id) => String(id))));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async (organizerId, isFollowing) => {
    try {
      if (isFollowing) {
        await api.delete(`/organizers/${organizerId}/follow`);
        setFollowed((prev) => {
          const next = new Set(prev);
          next.delete(String(organizerId));
          return next;
        });
      } else {
        await api.post(`/organizers/${organizerId}/follow`);
        setFollowed((prev) => new Set(prev).add(String(organizerId)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Clubs / Organizers</h1>
      {organizers.length === 0 ? (
        <p>No organizers found</p>
      ) : (
        <div>
          {organizers.map((org) => {
            const isFollowing = followed.has(String(org._id));
            return (
              <div key={org._id} style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "1rem" }}>
                <h3>{org.organizerName}</h3>
                <p>Category: {org.category}</p>
                <p>{org.description}</p>
                <p>Contact: {org.contactEmail}</p>
                <div style={{ marginTop: "1rem" }}>
                  <Link to={`/organizers/${org._id}`} style={{ marginRight: "1rem" }}>
                    View Details
                  </Link>
                  {user?.role === "participant" && (
                    <button onClick={() => handleFollow(org._id, isFollowing)}>
                      {isFollowing ? "Unfollow" : "Follow"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
