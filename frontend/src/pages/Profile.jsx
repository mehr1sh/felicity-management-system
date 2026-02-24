import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

const INTERESTS = [
  "Sports", "Cultural", "Technical", "Literary", "Music", "Dance", "Art",
  "Photography", "Coding", "Robotics", "AI/ML", "Entrepreneurship",
  "Gaming", "Film", "Debate", "Science", "Mathematics", "Design"
];

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);

  const [resetReason, setResetReason] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadProfile();
    if (user?.role === "participant") {
      api.get("/organizers")
        .then(r => setOrganizers(r.data.organizers))
        .catch(error => console.error('Error loading organizers:', error));
    }
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/me");
      setProfile(res.data.user);
      setFormData(res.data.user);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleInterest = (interest) => {
    const cur = formData.interests || [];
    setFormData(prev => ({
      ...prev,
      interests: cur.includes(interest) ? cur.filter(i => i !== interest) : [...cur, interest]
    }));
  };

  const toggleFollow = (id) => {
    const cur = formData.followedOrganizers || [];
    const strId = String(id);
    setFormData(prev => ({
      ...prev,
      followedOrganizers: cur.map(String).includes(strId)
        ? cur.filter(i => String(i) !== strId)
        : [...cur, strId]
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updates = {};
      if (user.role === "participant") {
        const fields = ["firstName", "lastName", "contactNumber", "college", "interests", "followedOrganizers"];
        fields.forEach(f => { if (formData[f] !== undefined) updates[f] = formData[f]; });
      } else if (user.role === "organizer") {
        const fields = ["organizerName", "category", "description", "contactEmail", "contactNumber", "discordWebhookUrl"];
        fields.forEach(f => { if (formData[f] !== undefined) updates[f] = formData[f]; });
      }
      await api.patch("/me", updates);
      setSuccess("Profile updated!");
      setEditing(false);
      loadProfile();
    } catch (error) {
      setError(error.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setError("New passwords do not match");
    }
    setError(""); setSuccess(""); setSaving(true);
    try {
      await api.post("/me/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess("Password changed! Please log in again.");
      setTimeout(() => { logout(); navigate("/login"); }, 2000);
    } catch (e) {
      setError(e.response?.data?.error || "Failed");
    } finally { setSaving(false); }
  };

  const handleRequestPasswordReset = async (e) => {
    e.preventDefault();
    if (!resetReason.trim()) return setError("Please provide a reason for the reset request.");
    setError(""); setSuccess(""); setResetting(true);
    try {
      await api.post("/password-reset/request", {
        email: profile.email,
        reason: resetReason
      });
      setSuccess("Password reset request sent to admins successfully!");
      setResetReason("");
    } catch (e) {
      setError(e.response?.data?.error || "Failed to request password reset");
    } finally {
      setResetting(false);
    }
  };

  const testWebhook = async () => {
    setWebhookTesting(true); setError(""); setSuccess("");
    try {
      await api.post(`/organizers/${user.id}/discord/test`);
      setSuccess("Webhook test sent successfully!");
    } catch (e) {
      setError(e.response?.data?.error || "Test failed");
    } finally { setWebhookTesting(false); }
  };

  const saveWebhook = async () => {
    try {
      await api.patch(`/organizers/${user.id}/discord`, { discordWebhookUrl: formData.discordWebhookUrl || "" });
      setSuccess("Webhook URL saved!");
    } catch (e) {
      setError(e.response?.data?.error || "Failed");
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  const followedIds = (formData.followedOrganizers || []).map(String);

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1>My Profile</h1>
        {!editing
          ? <button onClick={() => setEditing(true)} style={{ padding: "0.5rem 1rem", cursor: "pointer", background: "white", color: "#333", border: "1px solid #ccc", borderRadius: "4px" }}> Edit</button>
          : <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleSaveProfile} disabled={saving} style={{ padding: "0.5rem 1rem", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => { setEditing(false); setFormData(profile); }} style={{ padding: "0.5rem 1rem", background: "white", color: "#333", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
          </div>}
      </div>

      {error && <div style={{ color: "white", background: "#dc3545", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>{error}</div>}
      {success && <div style={{ color: "white", background: "#28a745", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>{success}</div>}

      <div style={{ marginBottom: "1.5rem" }}>
        <span style={{ padding: "0.3rem 0.8rem", borderRadius: "20px", background: "#e8f0fe", fontWeight: "600" }}>
          {user.role === "participant" ? " Participant" : user.role === "organizer" ? " Organizer" : " Admin"}
        </span>
      </div>

      <section style={{ marginBottom: "1.5rem", padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>Account Information</h2>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Email (non-editable)</label>
          <input type="email" value={profile?.email || ""} disabled style={{ width: "100%", padding: "0.5rem", background: "#f5f5f5", color: "#777", boxSizing: "border-box" }} />
        </div>
        {user.role === "participant" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>First Name</label>
                <input type="text" name="firstName" value={formData.firstName || ""} onChange={handleChange} disabled={!editing} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", background: !editing ? "#f9f9f9" : "white" }} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Last Name</label>
                <input type="text" name="lastName" value={formData.lastName || ""} onChange={handleChange} disabled={!editing} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", background: !editing ? "#f9f9f9" : "white" }} />
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Contact Number</label>
              <input type="tel" name="contactNumber" value={formData.contactNumber || ""} onChange={handleChange} disabled={!editing} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", background: !editing ? "#f9f9f9" : "white" }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>College/Organization</label>
              <input type="text" name="college" value={formData.college || ""} onChange={handleChange} disabled={!editing} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", background: !editing ? "#f9f9f9" : "white" }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Participant Type (non-editable)</label>
              <input type="text" value={profile?.participantType || ""} disabled style={{ width: "100%", padding: "0.5rem", background: "#f5f5f5", color: "#777", boxSizing: "border-box" }} />
            </div>
          </>
        )}
        {user.role === "organizer" && (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Organizer Name</label>
              <input type="text" name="organizerName" value={formData.organizerName || ""} onChange={handleChange} disabled={!editing} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", background: !editing ? "#f9f9f9" : "white" }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Category</label>
              {editing ? (
                <select name="category" value={formData.category || ""} onChange={handleChange} style={{ width: "100%", padding: "0.5rem" }}>
                  {["Technical", "Cultural", "Sports", "Literary", "Miscellaneous"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : <input type="text" value={formData.category || ""} disabled style={{ width: "100%", padding: "0.5rem", background: "#f9f9f9", boxSizing: "border-box" }} />}
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Description</label>
              <textarea name="description" value={formData.description || ""} onChange={handleChange} disabled={!editing} rows={3} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", background: !editing ? "#f9f9f9" : "white" }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Contact Email</label>
              <input type="email" name="contactEmail" value={formData.contactEmail || ""} onChange={handleChange} disabled={!editing} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", background: !editing ? "#f9f9f9" : "white" }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Contact Number</label>
              <input type="tel" name="contactNumber" value={formData.contactNumber || ""} onChange={handleChange} disabled={!editing} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", background: !editing ? "#f9f9f9" : "white" }} />
            </div>
          </>
        )}
      </section>

      {user.role === "participant" && (
        <>
          <section style={{ marginBottom: "1.5rem", padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
            <h2>Areas of Interest</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {INTERESTS.map(interest => {
                const selected = (formData.interests || []).includes(interest);
                return (
                  <label key={interest} onClick={() => editing && toggleInterest(interest)} style={{
                    padding: "0.3rem 0.7rem", borderRadius: "20px", border: "2px solid",
                    borderColor: selected ? "#007bff" : "#ddd",
                    background: selected ? "#e8f0fe" : "white",
                    cursor: editing ? "pointer" : "default",
                    fontWeight: selected ? "600" : "normal"
                  }}>
                    {interest} {selected && ""}
                  </label>
                );
              })}
            </div>
          </section>

          <section style={{ marginBottom: "1.5rem", padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
            <h2>Followed Clubs</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
              {organizers.map(org => {
                const isFollowed = followedIds.includes(String(org._id));
                return (
                  <label key={org._id} onClick={() => editing && toggleFollow(org._id)} style={{
                    display: "flex", gap: "0.5rem", padding: "0.75rem", border: "2px solid",
                    borderColor: isFollowed ? "#007bff" : "#ddd",
                    background: isFollowed ? "#e8f0fe" : "white",
                    borderRadius: "8px", cursor: editing ? "pointer" : "default"
                  }}>
                    <input type="checkbox" checked={isFollowed} readOnly style={{ pointerEvents: "none" }} />
                    <div>
                      <div style={{ fontWeight: "600" }}>{org.organizerName}</div>
                      <div style={{ fontSize: "0.8rem", color: "#666" }}>{org.category}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        </>
      )}

      {user.role === "organizer" && (
        <section style={{ marginBottom: "1.5rem", padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h2>Discord Webhook Integration</h2>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>Auto-post to your Discord channel when a new event is published.</p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input type="url" name="discordWebhookUrl" value={formData.discordWebhookUrl || ""} onChange={handleChange}
              placeholder="https://discord.com/api/webhooks/..."
              style={{ flex: 1, padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }} />
            <button onClick={saveWebhook} style={{ padding: "0.5rem 0.8rem", cursor: "pointer", background: "#5865F2", color: "white", border: "none", borderRadius: "4px" }}>Save</button>
            <button onClick={testWebhook} disabled={webhookTesting || !formData.discordWebhookUrl}
              style={{ padding: "0.5rem 0.8rem", cursor: "pointer", border: "1px solid #5865F2", color: "#5865F2", background: "white", borderRadius: "4px" }}>
              {webhookTesting ? "Testing..." : "Test"}
            </button>
          </div>
        </section>
      )}

      <section style={{ padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
        <h2>Change Password</h2>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Current Password</label>
            <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} required style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>New Password</label>
            <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} required minLength={8} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.25rem" }}>Confirm New Password</label>
            <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} required style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
          </div>
          <button type="submit" disabled={saving} style={{ padding: "0.6rem 1.2rem", background: "#dc3545", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            {saving ? "Changing..." : "Change Password"}
          </button>
        </form>

        {user.role === "organizer" && (
          <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
            <h3 style={{ marginTop: 0, fontSize: "1.1rem" }}>Request Password Reset from Admin</h3>
            <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1rem" }}>If you've forgotten your current password, you can request an admin to reset it for you.</p>
            <form onSubmit={handleRequestPasswordReset}>
              <div style={{ marginBottom: "1rem" }}>
                <input
                  type="text"
                  value={resetReason}
                  onChange={e => setResetReason(e.target.value)}
                  placeholder="Reason for reset request (e.g. 'Forgot my password')"
                  required
                  style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }}
                />
              </div>
              <button type="submit" disabled={resetting} style={{ padding: "0.6rem 1.2rem", background: "#6c757d", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                {resetting ? "Sending Request..." : "Send Reset Request"}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

