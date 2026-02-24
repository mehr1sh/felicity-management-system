import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function BrowseEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ eventType: "", eligibility: "", startDate: "", endDate: "", followedOrganizers: false });
  const debouncedSearch = useDebounce(search, 300);

  const loadEvents = useCallback(async () => {
    try {
      const params = { status: "published" };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.eventType) params.eventType = filters.eventType;
      if (filters.eligibility) params.eligibility = filters.eligibility;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.followedOrganizers) params.followedOrganizers = "true";
      const res = await api.get("/events", { params });
      setEvents(res.data.events);
    } catch (error) {
      console.error('Error loading events:', error);
      // Optionally set error state: setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => {
    const params = {};
    if (filters.followedOrganizers) params.followedOrganizers = "true";

    api.get("/events/trending", { params })
      .then(r => setTrending(r.data.events || []))
      .catch(error => console.error('Error loading trending events:', error));
  }, [filters.followedOrganizers]);


  useEffect(() => { loadEvents(); }, [loadEvents]);

  const CARD_TYPES = {
    normal: { icon: "", color: "#e8f0fe" },
    merchandise: { icon: "", color: "#fce4ec" },
    hackathon: { icon: "", color: "#e8f5e9" },
  };

  const EventCard = ({ event, showTrending }) => (
    <Link to={`/events/${event._id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        border: "1px solid #ddd", borderRadius: "10px", padding: "1rem",
        background: "white", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer",
        height: "100%", boxSizing: "border-box",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ background: CARD_TYPES[event.eventType]?.color || "#f0f0f0", padding: "0.2rem 0.5rem", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "600" }}>
            {CARD_TYPES[event.eventType]?.icon} {event.eventType}
          </span>
          {showTrending && <span style={{ background: "#ff6b35", color: "white", padding: "0.2rem 0.5rem", borderRadius: "12px", fontSize: "0.75rem" }}> Trending</span>}
        </div>
        <h3 style={{ margin: "0 0 0.4rem", fontSize: "1rem" }}>{event.eventName}</h3>
        <p style={{ color: "#666", fontSize: "0.85rem", margin: "0.25rem 0" }}>
          {event.organizerId?.organizerName || "Unknown"}
        </p>
        <p style={{ color: "#666", fontSize: "0.85rem", margin: "0.25rem 0" }}>
          {new Date(event.eventStartDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <p style={{ color: "#888", fontSize: "0.8rem", margin: "0.25rem 0" }}>
          {event.eligibility}
        </p>
        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "700", color: event.registrationFee > 0 ? "#333" : "#28a745" }}>
            {event.registrationFee > 0 ? `₹${event.registrationFee}` : "Free"}
          </span>
          {event.eventTags?.slice(0, 2).map(tag => (
            <span key={tag} style={{ background: "#f0f0f0", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem" }}>{tag}</span>
          ))}
        </div>
      </div>
    </Link>
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Browse Events</h1>


      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder=" Search events or organizers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "1rem", border: "2px solid #ddd", borderRadius: "8px", boxSizing: "border-box", outline: "none" }}
          onFocus={e => e.target.style.borderColor = "#007bff"}
          onBlur={e => e.target.style.borderColor = "#ddd"}
        />
      </div>


      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem", padding: "1rem", background: "#f8f9fa", borderRadius: "8px" }}>
        <select value={filters.eventType} onChange={e => setFilters(p => ({ ...p, eventType: e.target.value }))}
          style={{ padding: "0.4rem 0.8rem", borderRadius: "4px", border: "1px solid #ddd" }}>
          <option value="">All Types</option>
          <option value="normal">Normal</option>
          <option value="merchandise">Merchandise</option>
          <option value="hackathon">Hackathon</option>
        </select>

        <select value={filters.eligibility} onChange={e => setFilters(p => ({ ...p, eligibility: e.target.value }))}
          style={{ padding: "0.4rem 0.8rem", borderRadius: "4px", border: "1px solid #ddd" }}>
          <option value="">All Eligibility</option>
          <option value="IIIT Students Only">IIIT Only</option>
          <option value="Open to All">Open to All</option>
        </select>

        <input type="date" placeholder="Start Date" value={filters.startDate}
          onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
          style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #ddd" }} />
        <input type="date" placeholder="End Date" value={filters.endDate}
          onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
          style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #ddd" }} />

        {user?.role === "participant" && (
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
            <input type="checkbox" checked={filters.followedOrganizers} onChange={e => setFilters(p => ({ ...p, followedOrganizers: e.target.checked }))} />
            Followed Clubs Only
          </label>
        )}

        {(filters.eventType || filters.eligibility || filters.startDate || filters.endDate || filters.followedOrganizers) && (
          <button onClick={() => setFilters({ eventType: "", eligibility: "", startDate: "", endDate: "", followedOrganizers: false })}
            style={{ padding: "0.4rem 0.8rem", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Clear Filters
          </button>
        )}
      </div>


      {trending.length > 0 && !search && !filters.eventType && !filters.eligibility && (
        <section style={{ marginBottom: "2rem" }}>
          <h2> Trending Now</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {trending.map(event => <EventCard key={event._id} event={event} showTrending />)}
          </div>
        </section>
      )}


      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>
            {search ? `Results for "${search}"` : "All Events"}
            <span style={{ fontSize: "1rem", color: "#888", fontWeight: "normal", marginLeft: "0.5rem" }}>({events.length})</span>
          </h2>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : events.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "3rem" }}>
            No events found{search ? ` for "${search}"` : ""}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {events.map(event => <EventCard key={event._id} event={event} />)}
          </div>
        )}
      </section>
    </div>
  );
}
