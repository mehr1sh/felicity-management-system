import { useEffect, useState } from "react";
import api from "../utils/api";

export function AdminOrganizers() {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ organizerName: "", category: "Technical", description: "", contactEmail: "", contactNumber: "" });
  const [newCredentials, setNewCredentials] = useState(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadOrganizers(); }, []);

  const loadOrganizers = async () => {
    try {
      const res = await api.get("/admin/organizers");
      setOrganizers(res.data.organizers);
    } catch (error) {
      console.error('Error loading organizers:', error);
    } finally { 
      setLoading(false); 
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post("/admin/organizers", formData);
      setNewCredentials(res.data.organizer);
      setFormData({ organizerName: "", category: "Technical", description: "", contactEmail: "", contactNumber: "" });
      loadOrganizers();
    } catch (e) {
      setMessage({ text: e.response?.data?.error || "Failed to create", type: "error" });
    } finally { setCreating(false); }
  };

  const handleDisable = async (id, orgName) => {
    const choice = confirm(`Manage organizer "${orgName}":\n\nClick OK for DISABLE (can re-enable later)\nClick Cancel to abort.\n\nTo permanently delete, use the Delete button.`);
    if (!choice) return;
    try {
      await api.delete(`/admin/organizers/${id}`);
      setMessage({ text: `${orgName} disabled`, type: "success" });
      loadOrganizers();
    } catch (e) {
      setMessage({ text: e.response?.data?.error || "Failed", type: "error" });
    }
  };

  const handleDelete = async (id, orgName) => {
    if (!confirm(`PERMANENTLY DELETE "${orgName}" and ALL their events? This cannot be undone!`)) return;
    try {
      await api.delete(`/admin/organizers/${id}?permanent=true`);
      setMessage({ text: `${orgName} permanently deleted`, type: "success" });
      loadOrganizers();
    } catch (e) {
      setMessage({ text: e.response?.data?.error || "Failed", type: "error" });
    }
  };

  const credentialText = newCredentials ? `Login Email: ${newCredentials.email}\nPassword: ${newCredentials.password}` : "";

  const copyCredentials = () => {
    navigator.clipboard.writeText(credentialText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>Manage Clubs/Organizers</h1>
        <button onClick={() => { setShowForm(!showForm); setNewCredentials(null); }}
          style={{ padding: "0.6rem 1.2rem", background: showForm ? "#6c757d" : "#007bff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
          {showForm ? "Cancel" : "+ Add New Organizer"}
        </button>
      </div>

      {message.text && (
        <div style={{ padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", background: message.type === "error" ? "#f8d7da" : "#d4edda", color: message.type === "error" ? "#721c24" : "#155724" }}>
          {message.text}
        </div>
      )}


      {showForm && !newCredentials && (
        <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem", background: "#f9f9f9" }}>
          <h2 style={{ marginTop: 0 }}>Add New Organizer</h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Organizer Name *</label>
                <input type="text" value={formData.organizerName} onChange={e => setFormData(p => ({ ...p, organizerName: e.target.value }))} required
                  style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Category *</label>
                <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} style={{ width: "100%", padding: "0.5rem" }}>
                  {["Technical", "Cultural", "Sports", "Literary", "Miscellaneous"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Description</label>
              <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2}
                style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Contact Email *</label>
                <input type="email" value={formData.contactEmail} onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))} required
                  style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Contact Number</label>
                <input type="tel" value={formData.contactNumber} onChange={e => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
                  style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
              </div>
            </div>
            <button type="submit" disabled={creating}
              style={{ padding: "0.6rem 1.5rem", background: "#28a745", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
              {creating ? "Creating..." : "Create Organizer Account"}
            </button>
          </form>
        </div>
      )}


      {newCredentials && (
        <div style={{ border: "2px solid #28a745", borderRadius: "8px", padding: "1.5rem", marginBottom: "1.5rem", background: "#f0fff4" }}>
          <h2 style={{ color: "#155724", marginTop: 0 }}> Organizer Created Successfully!</h2>
          <p style={{ color: "#155724" }}>Share these credentials with the organizer. <strong>Password will not be shown again.</strong></p>
          <div style={{ background: "#1a1a2e", color: "#00ff88", padding: "1rem", borderRadius: "6px", fontFamily: "monospace", marginBottom: "1rem", whiteSpace: "pre" }}>
            {credentialText}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={copyCredentials} style={{ padding: "0.5rem 1rem", background: copied ? "#28a745" : "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              {copied ? " Copied!" : " Copy Credentials"}
            </button>
            <button onClick={() => { setNewCredentials(null); setShowForm(false); }}
              style={{ padding: "0.5rem 1rem", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Done
            </button>
          </div>
        </div>
      )}


      <h2>Organizers ({organizers.length})</h2>
      {organizers.length === 0 ? (
        <p style={{ color: "#888" }}>No organizers yet. Add one above.</p>
      ) : (
        <div>
          {organizers.map(org => (
            <div key={org._id} style={{
              border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", marginBottom: "0.75rem",
              opacity: org.isActive === false ? 0.6 : 1,
              background: org.isActive === false ? "#f8f8f8" : "white"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h3 style={{ margin: "0" }}>{org.organizerName}</h3>
                    {org.isActive === false && (
                      <span style={{ background: "#dc3545", color: "white", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem" }}>DISABLED</span>
                    )}
                  </div>
                  <p style={{ color: "#666", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
                    {org.category} · {org.contactEmail}
                  </p>
                  <p style={{ color: "#888", margin: "0.25rem 0 0", fontSize: "0.8rem", fontFamily: "monospace" }}>
                    Login: {org.email}
                  </p>
                </div>
                {org.isActive !== false && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => handleDisable(org._id, org.organizerName)}
                      style={{ padding: "0.4rem 0.8rem", background: "#ffc107", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}>
                      Disable
                    </button>
                    <button onClick={() => handleDelete(org._id, org.organizerName)}
                      style={{ padding: "0.4rem 0.8rem", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
