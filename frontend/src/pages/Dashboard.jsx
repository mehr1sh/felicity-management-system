import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

const STATUS_COLORS = {
  draft: "#6c757d",
  published: "#28a745",
  ongoing: "#17a2b8",
  closed: "#dc3545",
  completed: "#6f42c1",
};

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("normal");
  const [adminStats, setAdminStats] = useState(null);

  // Feedback State
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      if (user.role === "participant") {
        const res = await api.get("/registrations/my");
        setData({ registrations: res.data.registrations });
      } else if (user.role === "organizer") {
        const [eventsRes, analyticsRes] = await Promise.all([
          api.get("/events", { params: { organizerId: user.id, status: undefined } }),
          api.get(`/organizers/${user.id}/analytics`).catch(() => ({ data: { analytics: {} } })),
        ]);
        // Fetch all events including drafts
        const allEventsRes = await api.get("/events", {
          params: { organizerId: user.id }
        });
        setData({ events: allEventsRes.data.events, analytics: analyticsRes.data.analytics });
      } else if (user.role === "admin") {
        const [orgsRes, statsRes] = await Promise.all([
          api.get("/admin/organizers"),
          api.get("/admin/stats").catch(() => ({ data: {} })),
        ]);
        setData({ organizers: orgsRes.data.organizers });
        setAdminStats(statsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    setFeedbackSubmitting(true);
    try {
      await api.post(`/feedback/${feedbackModal.eventId._id}`, {
        rating: feedbackRating,
        comment: feedbackComment,
      });
      alert("Feedback submitted anonymously!");
      setFeedbackModal(null);
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  // ── PARTICIPANT DASHBOARD ──
  if (user.role === "participant") {
    const regs = data?.registrations || [];
    const upcoming = regs.filter(
      (r) => r.status === "registered" && new Date(r.eventId?.eventStartDate) > new Date()
    );
    const normal = regs.filter((r) => r.eventType === "normal" || r.eventType === "hackathon");
    const merchandise = regs.filter((r) => r.eventType === "merchandise");
    const completed = regs.filter((r) => r.status === "completed");
    const cancelled = regs.filter((r) => ["cancelled", "rejected", "payment_rejected"].includes(r.status));

    const tabData = { normal, merchandise, completed, cancelled };
    const tabLabels = { normal: "Normal Events", merchandise: "Merchandise", completed: "Completed", cancelled: "Cancelled/Rejected" };

    // Generate ICS for all upcoming events
    const exportAllToCalendar = () => {
      const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Felicity EMS//EN"];
      upcoming.forEach((r) => {
        const ev = r.eventId;
        if (!ev) return;
        const dtStart = new Date(ev.eventStartDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        const dtEnd = new Date(ev.eventEndDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        lines.push("BEGIN:VEVENT");
        lines.push(`SUMMARY:${ev.eventName}`);
        lines.push(`DTSTART:${dtStart}`);
        lines.push(`DTEND:${dtEnd}`);
        lines.push(`DESCRIPTION:Ticket ID: ${r.ticketId}`);
        lines.push("END:VEVENT");
      });
      lines.push("END:VCALENDAR");
      const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "my-events.ics"; a.click();
    };

    return (
      <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1>My Events Dashboard</h1>
        </div>

        {/* Upcoming Events */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ borderBottom: "2px solid #007bff", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            Upcoming Events ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <p style={{ color: "#888" }}>No upcoming events. <Link to="/events">Browse events</Link></p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
              {upcoming.map((reg) => (
                <div key={reg._id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", background: "white" }}>
                  <h3 style={{ margin: "0 0 0.5rem" }}>
                    <Link to={`/events/${reg.eventId?._id}`} style={{ textDecoration: "none", color: "#333" }}>
                      {reg.eventId?.eventName}
                    </Link>
                  </h3>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <span style={{ background: "#e8f0fe", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem" }}>
                      {reg.eventType}
                    </span>
                    <span style={{ background: "#e8f5e9", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem" }}>
                      {reg.eventId?.organizerId?.organizerName || "Organizer"}
                    </span>
                  </div>
                  <p style={{ color: "#666", fontSize: "0.9rem", margin: "0.25rem 0" }}>
                    {new Date(reg.eventId?.eventStartDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p style={{ margin: "0.25rem 0" }}>
                    <Link to={`/registrations/${reg._id}`} style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {reg.ticketId}
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Participation History Tabs */}
        <section>
          <h2 style={{ borderBottom: "2px solid #ddd", paddingBottom: "0.5rem", marginBottom: "1rem" }}>Participation History</h2>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", borderBottom: "1px solid #ddd" }}>
            {Object.entries(tabLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "0.5rem 1rem", border: "none", background: "transparent",
                  borderBottom: activeTab === key ? "3px solid #007bff" : "3px solid transparent",
                  cursor: "pointer", fontWeight: activeTab === key ? "700" : "normal",
                  color: activeTab === key ? "#007bff" : "#333",
                }}
              >{label} ({tabData[key].length})</button>
            ))}
          </div>

          {tabData[activeTab].length === 0 ? (
            <p style={{ color: "#888" }}>No records in this category.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Event</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Type</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Status</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Ticket ID</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tabData[activeTab].map((reg) => (
                    <tr key={reg._id}>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem" }}>
                        <Link to={`/events/${reg.eventId?._id}`}>{reg.eventId?.eventName || "N/A"}</Link>
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem" }}>{reg.eventType}</td>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem" }}>
                        <span style={{
                          padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem",
                          background: reg.status === "registered" ? "#d4edda" : reg.status === "completed" ? "#cce5ff" : "#f8d7da",
                          color: reg.status === "registered" ? "#155724" : reg.status === "completed" ? "#004085" : "#721c24"
                        }}>
                          {reg.status.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem" }}>
                        <Link to={`/registrations/${reg._id}`} style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                          {reg.ticketId}
                        </Link>
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "center" }}>
                        {reg.status === "completed" && (
                          <button onClick={() => { setFeedbackModal(reg); setFeedbackRating(5); setFeedbackComment(""); }}
                            style={{ padding: "0.3rem 0.6rem", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}>
                            Give Feedback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Feedback Modal */}
        {feedbackModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "white", padding: "2rem", borderRadius: "8px", width: "90%", maxWidth: "450px" }}>
              <h3 style={{ margin: "0 0 1rem" }}>Feedback for {feedbackModal.eventId?.eventName}</h3>
              <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1rem" }}>Your feedback will be anonymous to the organizer.</p>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "600" }}>Rating: {feedbackRating} / 5</label>
                <input type="range" min={1} max={5} value={feedbackRating} onChange={e => setFeedbackRating(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "600" }}>Comment (Optional)</label>
                <textarea rows={4} value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button onClick={() => setFeedbackModal(null)} style={{ padding: "0.5rem 1rem", background: "white", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleFeedbackSubmit} disabled={feedbackSubmitting} style={{ padding: "0.5rem 1rem", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                  {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ── ORGANIZER DASHBOARD ──
  if (user.role === "organizer") {
    const analytics = data?.analytics || {};
    const events = data?.events || [];

    return (
      <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1>Organizer Dashboard</h1>
          <Link to="/events/create" style={{ padding: "0.6rem 1.2rem", background: "#007bff", color: "white", textDecoration: "none", borderRadius: "6px" }}>
            + Create Event
          </Link>
        </div>

        {/* Analytics Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Total Events", value: analytics.totalEvents || events.length },
            { label: "Completed", value: analytics.completedEvents || 0 },
            { label: "Registrations", value: analytics.totalRegistrations || 0 },
            { label: "Revenue", value: `₹${analytics.totalRevenue || 0}` },
          ].map(card => (
            <div key={card.label} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", background: "white", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem" }}>{card.icon}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: "700" }}>{card.value}</div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Events Carousel */}
        <h2 style={{ borderBottom: "2px solid #ddd", paddingBottom: "0.5rem", marginBottom: "1rem" }}>My Events</h2>
        {events.length === 0 ? (
          <p style={{ color: "#888" }}>No events yet. <Link to="/events/create">Create your first event</Link></p>
        ) : (
          <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem" }}>
            {events.map((event) => (
              <div key={event._id} style={{
                minWidth: "280px", border: "1px solid #ddd", borderRadius: "8px",
                padding: "1rem", background: "white", flexShrink: 0
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>{event.eventName}</h3>
                  <span style={{
                    padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem",
                    background: STATUS_COLORS[event.status] + "22",
                    color: STATUS_COLORS[event.status], fontWeight: "600",
                  }}>{event.status}</span>
                </div>
                <span style={{ background: "#f0f0f0", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", marginBottom: "0.5rem", display: "inline-block" }}>
                  {event.eventType}
                </span>
                <p style={{ color: "#666", fontSize: "0.8rem", margin: "0.4rem 0" }}>
                  {new Date(event.eventStartDate).toLocaleDateString()}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <Link to={`/events/${event._id}/manage`} style={{ flex: 1, textAlign: "center", padding: "0.4rem", background: "#007bff", color: "white", textDecoration: "none", borderRadius: "4px", fontSize: "0.85rem" }}>
                    Manage
                  </Link>
                  <Link to={`/events/${event._id}`} style={{ flex: 1, textAlign: "center", padding: "0.4rem", background: "#f0f0f0", color: "#333", textDecoration: "none", borderRadius: "4px", fontSize: "0.85rem" }}>
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── ADMIN DASHBOARD ──
  if (user.role === "admin") {
    return (
      <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
        <h1>Admin Dashboard</h1>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Participants", value: adminStats?.participants ?? "…" },
            { label: "Organizers", value: adminStats?.organizers ?? "…" },
            { label: "Events", value: adminStats?.events ?? "…" },
            { label: "Revenue", value: adminStats ? `₹${adminStats.revenue}` : "…" },
            { label: "Registrations", value: adminStats?.registrations ?? "…" },
          ].map(card => (
            <div key={card.label} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", background: "white", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem" }}>{card.icon}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: "700" }}>{card.value}</div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link to="/admin/organizers" style={{ padding: "0.75rem 1.5rem", background: "#007bff", color: "white", textDecoration: "none", borderRadius: "6px" }}>
            Manage Clubs/Organizers
          </Link>
          <Link to="/admin/password-resets" style={{ padding: "0.75rem 1.5rem", background: "#6c757d", color: "white", textDecoration: "none", borderRadius: "6px" }}>
            Password Reset Requests
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
