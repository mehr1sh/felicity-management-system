import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utils/api";

export function TicketView() {
  const { id } = useParams();
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTicket(); }, [id]);

  const loadTicket = async () => {
    try {
      const res = await api.get(`/registrations/${id}`);
      setRegistration(res.data.registration);
    } catch (error) {  // Add (error) parameter
      console.error('Error loading ticket:', error);  // Handle error appropriately
    } finally { 
      setLoading(false); 
    }
  };


  const handlePrint = () => window.print();

  const downloadICS = () => {
    const ev = registration.eventId;
    if (!ev) return;
    
    const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//YourApp//Events//EN",
      "BEGIN:VEVENT",
      `UID:${registration.ticketId}@yourapp.com`,  // Unique ID
      `SUMMARY:${ev.eventName}`,
      `DTSTART:${fmt(ev.eventStartDate)}`,
      `DTEND:${fmt(ev.eventEndDate)}`,
      `DESCRIPTION:Ticket ID: ${registration.ticketId}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\\r\\n");  // Use \\r\\n for proper line endings
    
    const blob = new Blob([ics], { type: "text/calendar;charset=utf8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.eventName.replace(/[^a-z0-9]/gi, '_')}.ics`;  // Sanitize filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);  // Clean up
  };


  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (!registration) return <div style={{ padding: "2rem" }}>Ticket not found</div>;

  const event = registration.eventId;
  const participant = registration.participantId;
  const statusColor = registration.status === "registered" ? "#28a745" : registration.status === "pending_approval" ? "#ffc107" : "#dc3545";

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <Link to="/dashboard" style={{ color: "#007bff" }}>← Dashboard</Link>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={downloadICS} style={{ padding: "0.4rem 0.8rem", cursor: "pointer" }}> Calendar</button>
          <button onClick={handlePrint} style={{ padding: "0.4rem 0.8rem", cursor: "pointer" }}> Print</button>
        </div>
      </div>


      <div style={{ border: "3px solid #333", borderRadius: "12px", overflow: "hidden", background: "white" }}>

        <div style={{ background: "#1a1a2e", color: "white", padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "0.3rem" }}> FELICITY EMS TICKET</div>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{event?.eventName || "N/A"}</h2>
        </div>


        <div style={{ padding: "1.5rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            {[
              ["Participant", `${participant?.firstName || ""} ${participant?.lastName || ""}`.trim()],
              ["Email", participant?.email || ""],
              ["Event Date", event ? new Date(event.eventStartDate).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""],
              ["Event End", event ? new Date(event.eventEndDate).toLocaleDateString() : ""],
              ["Organizer", event?.organizerId?.organizerName || ""],
              ["Eligibility", event?.eligibility || ""],
              ...(registration.eventType === "merchandise" ? [
                ["Item", registration.purchase?.itemName || ""],
                ["Quantity", String(registration.purchase?.quantity || 1)],
              ] : []),
              ...(registration.teamName ? [["Team", registration.teamName]] : []),
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: "0.5rem 0.25rem", color: "#555", fontWeight: "600", borderBottom: "1px solid #f0f0f0", width: "40%" }}>{k}</td>
                <td style={{ padding: "0.5rem 0.25rem", borderBottom: "1px solid #f0f0f0" }}>{v}</td>
              </tr>
            ))}
          </table>


          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <div style={{ fontFamily: "monospace", fontSize: "1.2rem", fontWeight: "700", letterSpacing: "0.1em", padding: "0.5rem", background: "#f8f9fa", borderRadius: "6px" }}>
              {registration.ticketId}
            </div>
            <div style={{ marginTop: "0.5rem", display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "20px", background: statusColor + "22", color: statusColor, fontWeight: "600", fontSize: "0.9rem" }}>
              {registration.status.replace("_", " ").toUpperCase()}
            </div>
          </div>


          {registration.qrDataUrl && registration.status === "registered" && (
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <img src={registration.qrDataUrl} alt="QR Code" style={{ width: "220px", height: "220px" }} />
              <p style={{ color: "#888", fontSize: "0.8rem", marginTop: "0.25rem" }}>Show this QR code at the event</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
