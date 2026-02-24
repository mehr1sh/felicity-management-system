import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { DiscussionForum } from "../components/DiscussionForum";

const STATUS_COLORS = {
  draft: "#6c757d", published: "#28a745", ongoing: "#17a2b8", closed: "#dc3545", completed: "#6f42c1",
};

export function OrganizerEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [attendance, setAttendance] = useState({ scanned: [], notScanned: [], totalRegistered: 0, totalScanned: 0 });
  const [pendingPayments, setPendingPayments] = useState([]);
  const [feedbackData, setFeedbackData] = useState({ average: 0, total: 0, distribution: {}, comments: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  // QR scanner state
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  // Edit state
  const [editDesc, setEditDesc] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editLimit, setEditLimit] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  const loadEvent = useCallback(async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
      setEditDesc(res.data.event.eventDescription);
      setEditDeadline(new Date(res.data.event.registrationDeadline).toISOString().slice(0, 16));
      setEditLimit(res.data.event.registrationLimit);
    } catch { }
  }, [id]);

  const loadRegs = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get(`/events/${id}/registrations`, { params });
      setRegistrations(res.data.registrations);
    } catch { }
  }, [id, search, statusFilter]);

  const loadAttendance = useCallback(async () => {
    try {
      const res = await api.get(`/attendance/events/${id}`);
      setAttendance(res.data);
    } catch { }
  }, [id]);

  const loadPayments = useCallback(async () => {
    try {
      const res = await api.get("/payments/pending");
      const eventPayments = res.data.registrations.filter(r => String(r.eventId?._id) === id || String(r.eventId) === id);
      setPendingPayments(eventPayments);
    } catch { }
  }, [id]);

  const loadFeedbacks = useCallback(async () => {
    try {
      const res = await api.get(`/feedback/events/${id}`);
      setFeedbackData(res.data);
    } catch { }
  }, [id]);

  useEffect(() => {
    Promise.all([loadEvent(), loadRegs()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (activeTab === "participants") loadRegs(); }, [activeTab, search, statusFilter]);
  useEffect(() => { if (activeTab === "attendance") loadAttendance(); }, [activeTab]);
  useEffect(() => { if (activeTab === "payments") loadPayments(); }, [activeTab]);
  useEffect(() => { if (activeTab === "feedback") loadFeedbacks(); }, [activeTab]);

  const showMsg = (text, type = "success") => { setMessage({ text, type }); setTimeout(() => setMessage({ text: "", type: "" }), 4000); };

  const handlePublish = async () => {
    try { await api.post(`/events/${id}/publish`); showMsg("Event published!"); loadEvent(); }
    catch (e) { showMsg(e.response?.data?.error || "Failed", "error"); }
  };

  const handleStatusChange = async (status) => {
    try { await api.patch(`/events/${id}`, { status }); showMsg(`Status changed to ${status}`); loadEvent(); }
    catch (e) { showMsg(e.response?.data?.error || "Failed", "error"); }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const updates = {};
      // Always check description
      if (editDesc !== event.eventDescription) updates.eventDescription = editDesc;
      // Deadline
      if (editDeadline && new Date(editDeadline).toISOString() !== new Date(event.registrationDeadline).toISOString()) {
        updates.registrationDeadline = new Date(editDeadline).toISOString();
      }
      // Limit (for published: increase only; for draft: any value)
      if (editLimit && editLimit !== event.registrationLimit) updates.registrationLimit = editLimit;

      // Draft-only extra fields from formData
      if (event.status === "draft") {
        if (formData.eventName !== undefined && formData.eventName !== event.eventName) updates.eventName = formData.eventName;
        if (formData.eligibility !== undefined && formData.eligibility !== event.eligibility) updates.eligibility = formData.eligibility;
        if (formData.registrationFee !== undefined && formData.registrationFee !== event.registrationFee) updates.registrationFee = formData.registrationFee;
        if (formData.registrationLimit !== undefined && formData.registrationLimit !== event.registrationLimit) updates.registrationLimit = formData.registrationLimit;
        if (formData.eventStartDate !== undefined) updates.eventStartDate = new Date(formData.eventStartDate).toISOString();
        if (formData.eventEndDate !== undefined) updates.eventEndDate = new Date(formData.eventEndDate).toISOString();
      }

      if (Object.keys(updates).length) {
        await api.patch(`/events/${id}`, updates);
        showMsg("Saved!");
        loadEvent();
      }
    } catch (e) { showMsg(e.response?.data?.error || "Failed", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this draft event?")) return;
    try { await api.delete(`/events/${id}`); navigate("/dashboard"); }
    catch (e) { showMsg(e.response?.data?.error || "Failed", "error"); }
  };

  const handleExport = async () => {
    const res = await api.get(`/events/${id}/registrations/export`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a"); a.href = url; a.download = `event-${id}-registrations.csv`; a.click();
  };

  const handleExportAttendance = async () => {
    const res = await api.get(`/attendance/events/${id}/export`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a"); a.href = url; a.download = `attendance-${id}.csv`; a.click();
  };

  const handleQRScan = async () => {
    setScanError(""); setScanResult(null);
    const raw = qrInput.trim();
    if (!raw) return setScanError("Enter ticket ID or QR code content");
    let ticketId = raw;
    try { const parsed = JSON.parse(raw); ticketId = parsed.ticketId || raw; } catch { }
    try {
      const res = await api.post(`/attendance/events/${id}/scan`, { ticketId });
      setScanResult(res.data);
      showMsg(`${res.data.participant?.firstName} marked present!`);
      loadAttendance();
      setQrInput("");
    } catch (e) {
      setScanError(e.response?.data?.error || "Scan failed");
      if (e.response?.status === 409) {
        setScanError(e.response.data.error);  // Already present
      }
    }
  };

  const handleManualMark = async (participantId, notes = "") => {
    try {
      await api.post(`/attendance/events/${id}/manual`, { participantId, notes });
      showMsg("Attendance marked manually");
      loadAttendance();
    } catch (e) { showMsg(e.response?.data?.error || "Failed", "error"); }
  };

  const handleApprovePayment = async (regId) => {
    try { await api.post(`/payments/${regId}/approve`); showMsg("Payment approved!"); loadPayments(); }
    catch (e) { showMsg(e.response?.data?.error || "Failed", "error"); }
  };

  const handleRejectPayment = async (regId) => {
    const reason = prompt("Rejection reason (required):");
    if (!reason) return;
    try { await api.post(`/payments/${regId}/reject`, { comment: reason }); showMsg("Payment rejected"); loadPayments(); }
    catch (e) { showMsg(e.response?.data?.error || "Failed", "error"); }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (!event) return <div style={{ padding: "2rem" }}>Event not found</div>;

  const tabs = ["overview", "participants", "forum", ...(event.eventType === "merchandise" ? ["payments"] : []), ...(["published", "ongoing", "closed", "completed"].includes(event.status) ? ["feedback"] : [])];

  return (
    <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.5rem" }}>{event.eventName}</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ background: STATUS_COLORS[event.status] + "22", color: STATUS_COLORS[event.status], padding: "0.3rem 0.7rem", borderRadius: "20px", fontWeight: "600", fontSize: "0.85rem" }}>
              {event.status}
            </span>
            <span style={{ background: "#f0f0f0", padding: "0.3rem 0.7rem", borderRadius: "20px", fontSize: "0.85rem" }}>{event.eventType}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {event.status === "draft" && <>
            <button onClick={handlePublish} style={{ padding: "0.5rem 1rem", background: "#28a745", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>🚀 Publish</button>
            <button onClick={handleDelete} style={{ padding: "0.5rem 1rem", background: "#dc3545", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>🗑️ Delete</button>
          </>}
          {event.status === "published" && <>
            <button onClick={() => handleStatusChange("completed")} style={{ padding: "0.5rem 1rem", background: "#6f42c1", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>✅ Mark Completed</button>
            <button onClick={() => handleStatusChange("closed")} style={{ padding: "0.5rem 1rem", background: "#dc3545", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Close Registrations</button>
          </>}
          {event.status === "ongoing" && <>
            <button onClick={() => handleStatusChange("completed")} style={{ padding: "0.5rem 1rem", background: "#6f42c1", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>✅ Mark Completed</button>
            <button onClick={() => handleStatusChange("closed")} style={{ padding: "0.5rem 1rem", background: "#dc3545", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Close</button>
          </>}
        </div>
      </div>

      {message.text && (
        <div style={{ padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", background: message.type === "error" ? "#f8d7da" : "#d4edda", color: message.type === "error" ? "#721c24" : "#155724" }}>
          {message.text}
        </div>
      )}

      {/* Analytics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Registrations", value: `${event.stats?.registrationsCount || 0} / ${event.registrationLimit}` },
          { label: "Revenue", value: `₹${event.stats?.revenue || 0}` },
          ...(event.eventType === "merchandise" ? [{ label: "Sales", value: event.stats?.salesCount || 0}] : []),
        ].map(c => (
          <div key={c.label} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", textAlign: "center", background: "white" }}>
            <div style={{ fontSize: "1.5rem" }}>{c.icon}</div>
            <div style={{ fontSize: "1.2rem", fontWeight: "700" }}>{c.value}</div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #ddd", marginBottom: "1.5rem" }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "0.5rem 1.2rem", border: "none", background: "transparent", cursor: "pointer",
            borderBottom: activeTab === tab ? "3px solid #007bff" : "3px solid transparent",
            fontWeight: activeTab === tab ? "700" : "normal", color: activeTab === tab ? "#007bff" : "#333",
            textTransform: "capitalize",
          }}>{tab}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
            {[
              ["Name", event.eventName], ["Type", event.eventType], ["Status", event.status],
              ["Eligibility", event.eligibility],
              ["Registration Deadline", new Date(event.registrationDeadline).toLocaleString()],
              ["Event Start", new Date(event.eventStartDate).toLocaleString()],
              ["Event End", new Date(event.eventEndDate).toLocaleString()],
              ["Registration Limit", event.registrationLimit],
              ["Fee", `₹${event.registrationFee || 0}`],
              ["Tags", event.eventTags?.join(", ") || "None"],
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: "0.5rem", fontWeight: "600", width: "35%", borderBottom: "1px solid #f0f0f0", color: "#555" }}>{k}</td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid #f0f0f0" }}>{v}</td>
              </tr>
            ))}
          </table>

          {/* Edit section based on status */}
          {(event.status === "draft" || event.status === "published") && (
            <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem" }}>
              <h3 style={{ marginTop: 0 }}>Edit Event</h3>
              {event.status === "published" && <p style={{ color: "#856404", background: "#fff3cd", padding: "0.5rem", borderRadius: "4px", marginBottom: "1rem" }}>⚠️ Only description, deadline (future), and limit (increase only) can be edited after publishing.</p>}

              {/* DRAFT: all fields editable */}
              {event.status === "draft" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Event Name</label>
                    <input type="text" value={formData.eventName ?? event.eventName}
                      onChange={e => setFormData(p => ({ ...p, eventName: e.target.value }))}
                      style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Description</label>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                      rows={4} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Eligibility</label>
                      <select value={formData.eligibility ?? event.eligibility}
                        onChange={e => setFormData(p => ({ ...p, eligibility: e.target.value }))}
                        style={{ width: "100%", padding: "0.5rem" }}>
                        <option value="IIIT Students Only">IIIT Students Only</option>
                        <option value="Open to All">Open to All</option>
                        <option value="IIIT Students & Alumni">IIIT Students &amp; Alumni</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Registration Fee (₹)</label>
                      <input type="number" min={0}
                        value={formData.registrationFee ?? event.registrationFee ?? 0}
                        onChange={e => setFormData(p => ({ ...p, registrationFee: Number(e.target.value) }))}
                        style={{ width: "100%", padding: "0.5rem" }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Registration Deadline</label>
                      <input type="datetime-local" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Event Start</label>
                      <input type="datetime-local"
                        value={formData.eventStartDate ?? new Date(event.eventStartDate).toISOString().slice(0, 16)}
                        onChange={e => setFormData(p => ({ ...p, eventStartDate: e.target.value }))}
                        style={{ width: "100%", padding: "0.5rem" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Event End</label>
                      <input type="datetime-local"
                        value={formData.eventEndDate ?? new Date(event.eventEndDate).toISOString().slice(0, 16)}
                        onChange={e => setFormData(p => ({ ...p, eventEndDate: e.target.value }))}
                        style={{ width: "100%", padding: "0.5rem" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Registration Limit</label>
                    <input type="number" min={1}
                      value={formData.registrationLimit ?? event.registrationLimit}
                      onChange={e => setFormData(p => ({ ...p, registrationLimit: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "0.5rem" }} />
                  </div>
                </>
              )}

              {/* PUBLISHED: restricted edits */}
              {event.status === "published" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Description</label>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                      rows={4} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Registration Deadline</label>
                    <input type="datetime-local" value={editDeadline} onChange={e => setEditDeadline(e.target.value)}
                      style={{ width: "100%", padding: "0.5rem" }} />
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Registration Limit (current: {event.registrationLimit})</label>
                    <input type="number" value={editLimit} min={event.registrationLimit}
                      onChange={e => setEditLimit(Number(e.target.value))}
                      style={{ width: "100%", padding: "0.5rem" }} />
                  </div>
                </>
              )}

              <button onClick={handleSaveEdit} disabled={saving}
                style={{ padding: "0.6rem 1.2rem", background: "#007bff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {/* Form lock warning */}
          {event.formSchema?.length > 0 && (event.stats?.registrationsCount || 0) > 0 && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fff3cd", borderRadius: "6px" }}>
              Form locked — {event.stats.registrationsCount} registration(s) received
            </div>
          )}
        </div>
      )}

      {/* ── PARTICIPANTS TAB ── */}
      {activeTab === "participants" && (
        <div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <input type="text" placeholder="Search by name/email" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd", flex: 1 }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}>
              <option value="">All Status</option>
              <option value="registered">Registered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending_approval">Pending Approval</option>
            </select>
            <button onClick={handleExport} style={{ padding: "0.5rem 1rem", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Export CSV</button>
          </div>
          {registrations.length === 0 ? <p style={{ color: "#888" }}>No registrations found</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Name</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Email</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Date</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Payment</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Status</th>
                    <th style={{ border: "1px solid #ddd", padding: "0.6rem", textAlign: "left" }}>Ticket ID</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(reg => (
                    <tr key={reg._id}>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem" }}>{reg.participantId?.firstName} {reg.participantId?.lastName}</td>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem" }}>{reg.participantId?.email}</td>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem" }}>{new Date(reg.createdAt).toLocaleDateString()}</td>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem" }}>
                        {reg.eventType === "normal" ? (event.registrationFee > 0 ? "Paid" : "Free") : reg.purchase?.paymentStatus || "N/A"}
                      </td>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem" }}>{reg.status}</td>
                      <td style={{ border: "1px solid #ddd", padding: "0.6rem", fontFamily: "monospace", fontSize: "0.8rem" }}>{reg.ticketId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === "attendance" && (
        <div>
          {/* QR Scan Input */}
          <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <h3>🔍 QR Code Scanner</h3>
            <p style={{ color: "#666", fontSize: "0.9rem" }}>Enter ticket ID or paste QR code content to mark attendance:</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input type="text" value={qrInput} onChange={e => { setQrInput(e.target.value); setScanError(""); setScanResult(null); }}
                onKeyDown={e => e.key === "Enter" && handleQRScan()}
                placeholder="Ticket ID (e.g. TKT-XXXXXXXXXX) or scan QR"
                style={{ flex: 1, padding: "0.6rem", borderRadius: "4px", border: "1px solid #ddd", fontFamily: "monospace" }} />
              <button onClick={handleQRScan} style={{ padding: "0.6rem 1.2rem", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                Mark Present
              </button>
            </div>
            {scanError && <div style={{ marginTop: "0.5rem", color: "#dc3545" }}>{scanError}</div>}
            {scanResult && <div style={{ marginTop: "0.5rem", color: "#28a745" }}>{scanResult.participant?.firstName} {scanResult.participant?.lastName} marked present!</div>}
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span>Attendance Progress</span>
              <span>{attendance.totalScanned}/{attendance.totalRegistered}</span>
            </div>
            <div style={{ background: "#e9ecef", borderRadius: "4px", height: "12px" }}>
              <div style={{
                background: "#28a745", height: "100%", borderRadius: "4px",
                width: `${attendance.totalRegistered > 0 ? (attendance.totalScanned / attendance.totalRegistered * 100) : 0}%`,
                transition: "width 0.3s"
              }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Scanned */}
            <div>
              <h3 style={{ color: "#28a745" }}>Scanned ({attendance.totalScanned})</h3>
              {attendance.scanned.map(a => (
                <div key={a._id} style={{ padding: "0.5rem", borderBottom: "1px solid #eee", fontSize: "0.9rem" }}>
                  <strong>{a.participantId?.firstName} {a.participantId?.lastName}</strong>
                  <div style={{ color: "#666", fontSize: "0.8rem" }}>
                    {a.method === "manual" ? "Manual" : "QR"} · {new Date(a.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
            {/* Not scanned */}
            <div>
              <h3 style={{ color: "#dc3545" }}>Not Scanned ({attendance.notScanned?.length || 0})</h3>
              {(attendance.notScanned || []).map((p, idx) => (
                <div key={idx} style={{ padding: "0.5rem", borderBottom: "1px solid #eee", fontSize: "0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{p.firstName} {p.lastName}</strong>
                    <div style={{ color: "#666", fontSize: "0.8rem" }}>{p.ticketId}</div>
                  </div>
                  <button onClick={() => {
                    const reason = prompt("Reason for manual mark (e.g. QR code damaged):");
                    if (reason !== null) handleManualMark(String(p._id), reason);
                  }} style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", cursor: "pointer", background: "#6c757d", color: "white", border: "none", borderRadius: "4px" }}>
                    Manual
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleExportAttendance} style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Export Attendance CSV
          </button>
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {activeTab === "payments" && (
        <div>
          <h3>Payment Approvals ({pendingPayments.length} pending)</h3>
          {pendingPayments.length === 0 ? <p style={{ color: "#888" }}>No pending payments</p> : pendingPayments.map(reg => (
            <div key={reg._id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p><strong>{reg.participantId?.firstName} {reg.participantId?.lastName}</strong> ({reg.participantId?.email})</p>
                  <p>Item: {reg.purchase?.itemName} | Qty: {reg.purchase?.quantity}</p>
                  <p>Status: <span style={{ background: "#fff3cd", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>{reg.purchase?.paymentStatus}</span></p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => handleApprovePayment(reg._id)} style={{ padding: "0.4rem 0.8rem", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>✅ Approve</button>
                  <button onClick={() => handleRejectPayment(reg._id)} style={{ padding: "0.4rem 0.8rem", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>❌ Reject</button>
                </div>
              </div>
              {reg.purchase?.paymentProof && (
                <div style={{ marginTop: "0.5rem" }}>
                  <strong>Payment Proof:</strong>
                  <img src={reg.purchase.paymentProof} alt="Payment Proof" style={{ display: "block", maxWidth: "300px", maxHeight: "300px", marginTop: "0.25rem", border: "1px solid #ddd" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── FEEDBACK TAB ── */}
      {activeTab === "feedback" && (
        <div>
          <h2>Anonymous Feedback</h2>
          {feedbackData.total === 0 ? (
            <p style={{ color: "#888" }}>No feedback has been submitted yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem", alignItems: "start" }}>
              <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem", background: "white", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 1rem" }}>Average Rating</h3>
                <div style={{ fontSize: "3rem", fontWeight: "700", color: "#f39c12" }}>{feedbackData.average.toFixed(1)} <span style={{ fontSize: "2rem" }}>★</span></div>
                <div style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.5rem" }}>Based on {feedbackData.total} reviews</div>
                <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
                  {[5, 4, 3, 2, 1].map(stars => (
                    <div key={stars} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                      <span style={{ width: "20px" }}>{stars}★</span>
                      <div style={{ height: "8px", flex: 1, background: "#f0f0f0", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${feedbackData.total ? (feedbackData.distribution[stars] || 0) / feedbackData.total * 100 : 0}%`, height: "100%", background: "#f39c12" }}></div>
                      </div>
                      <span style={{ width: "20px", textAlign: "right", color: "#666" }}>{feedbackData.distribution[stars] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ margin: "0 0 1rem" }}>Comments</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {feedbackData.comments.map((comment, idx) => (
                    <div key={idx} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", background: "white" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <div style={{ color: "#f39c12", fontWeight: "600" }}>{comment.rating} ★</div>
                        <div style={{ color: "#888", fontSize: "0.85rem" }}>{new Date(comment.date).toLocaleDateString()}</div>
                      </div>
                      <p style={{ margin: 0, color: "#333", whiteSpace: "pre-wrap" }}>{comment.comment || <span style={{ color: "#999", fontStyle: "italic" }}>No comment provided</span>}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FORUM TAB ── */}
      {activeTab === "forum" && (
        <div>
          <DiscussionForum eventId={id} isOrganizer={true} />
        </div>
      )}
    </div>
  );
}
