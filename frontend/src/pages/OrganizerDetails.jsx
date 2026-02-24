import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

export function OrganizerDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const res = await api.get(`/organizers/${id}`);
      setData(res.data);
      if (user?.role === "participant") {
        const meRes = await api.get("/me");
        const followed = (meRes.data.user.followedOrganizers || []).map(String);
        setFollowing(followed.includes(String(id)));
      }
    } catch (error) {
      console.error('Error loading organizer data:', error);
    } finally { 
      setLoading(false); 
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (following) { 
        await api.delete(`/organizers/${id}/follow`); 
        setFollowing(false); 
      } else { 
        await api.post(`/organizers/${id}/follow`); 
        setFollowing(true); 
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Optionally revert optimistic update or show toast
    }
  };


  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (!data) return <div style={{ padding: "2rem" }}>Organizer not found</div>;

  const { organizer, upcomingEvents, pastEvents } = data;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: "0 0 0.5rem" }}>{organizer.organizerName}</h1>
            <span style={{ background: "#e8f0fe", padding: "0.3rem 0.7rem", borderRadius: "20px", fontSize: "0.85rem" }}>{organizer.category}</span>
            <p style={{ color: "#555", marginTop: "0.75rem" }}>{organizer.description || "No description available."}</p>
            <p style={{ color: "#666", fontSize: "0.9rem" }}> {organizer.contactEmail}</p>
            {organizer.contactNumber && <p style={{ color: "#666", fontSize: "0.9rem" }}> {organizer.contactNumber}</p>}
          </div>
          {user?.role === "participant" && (
            <button onClick={handleFollowToggle}
              style={{ padding: "0.5rem 1.2rem", background: following ? "#6c757d" : "#007bff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
              {following ? " Following" : "+ Follow"}
            </button>
          )}
        </div>
      </div>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2>Upcoming Events ({upcomingEvents.length})</h2>
        {upcomingEvents.length === 0 ? <p style={{ color: "#888" }}>No upcoming events</p> :
          upcomingEvents.map(ev => (
            <div key={ev._id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 0.3rem" }}>{ev.eventName}</h3>
                <p style={{ color: "#666", margin: 0, fontSize: "0.9rem" }}>
                   {new Date(ev.eventStartDate).toLocaleDateString()} · {ev.eligibility}
                </p>
              </div>
              <Link to={`/events/${ev._id}`} style={{ padding: "0.4rem 0.8rem", background: "#007bff", color: "white", textDecoration: "none", borderRadius: "4px" }}>
                View &amp; Register
              </Link>
            </div>
          ))
        }
      </section>

      {pastEvents.length > 0 && (
        <section>
          <h2>Past Events ({pastEvents.length})</h2>
          {pastEvents.map(ev => (
            <div key={ev._id} style={{ border: "1px solid #eee", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.5rem", opacity: 0.75, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: "600" }}>{ev.eventName}</span>
              <span style={{ color: "#888", fontSize: "0.85rem" }}>{new Date(ev.eventEndDate).toLocaleDateString()}</span>
            </div>
          ))}
        </section>
      )}

      <Link to="/organizers" style={{ display: "inline-block", marginTop: "1rem", color: "#007bff" }}>← Back to Organizers</Link>
    </div>
  );
}
