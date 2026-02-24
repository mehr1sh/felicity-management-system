import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
import { DiscussionForum } from "../components/DiscussionForum";

export function EventDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [fileUploads, setFileUploads] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [myRegistration, setMyRegistration] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [teamMembers, setTeamMembers] = useState([""]);
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const loadEvent = useCallback(async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
    } catch { }
  }, [id]);

  const checkMyRegistration = useCallback(async () => {
    if (!user || user.role !== "participant") return;
    try {
      const res = await api.get("/registrations/my", { params: { eventId: id } });
      const mine = res.data.registrations.find(r => String(r.eventId?._id) === id || String(r.eventId) === id);
      setMyRegistration(mine || null);
    } catch { }
  }, [id, user]);

  useEffect(() => {
    Promise.all([loadEvent(), checkMyRegistration()]).finally(() => setLoading(false));
  }, [loadEvent, checkMyRegistration]);

  const handleRegisterNormal = async () => {
    setError(""); setSuccess("");
    try {
      const enrichedForm = { ...formData };
      for (const [fieldId, file] of Object.entries(fileUploads)) {
        const base64 = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = (e) => res(e.target.result);
          reader.readAsDataURL(file);
        });
        enrichedForm[fieldId] = base64;
      }
      await api.post(`/registrations/normal/${id}`, { formResponse: enrichedForm });
      setSuccess("Registration successful! Your ticket QR has been sent to your email.");
      setTimeout(() => { checkMyRegistration(); loadEvent(); }, 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  const handlePurchaseMerch = async () => {
    setError(""); setSuccess("");
    if (!event.merchItems?.length) return setError("No items available");
    const item = event.merchItems[0];
    // Validate all variants are selected
    if (item.variants?.length > 0) {
      for (const variant of item.variants) {
        if (!selectedVariants[variant.name]) {
          return setError(`Please select a ${variant.name}`);
        }
      }
    }
    try {
      await api.post(`/registrations/merchandise/${id}`, {
        itemName: item.itemName,
        variantSelection: Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined,
        quantity,
      });
      setSuccess("Order placed! Upload payment proof to confirm.");
      setTimeout(() => { checkMyRegistration(); loadEvent(); }, 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Purchase failed");
    }
  };

  const handleRegisterHackathon = async () => {
    setError(""); setSuccess("");
    try {
      const minSize = event.minTeamSize || 1;
      const maxSize = event.maxTeamSize || 4;
      const validMembers = teamMembers.filter(m => m.trim());
      if (validMembers.length < minSize) return setError(`Team must have at least ${minSize} member(s)`);
      if (validMembers.length > maxSize) return setError(`Team cannot exceed ${maxSize} members`);
      const enrichedForm = { ...formData };
      for (const [fieldId, file] of Object.entries(fileUploads)) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
        enrichedForm[fieldId] = base64;
      }
      await api.post(`/registrations/hackathon/${id}`, { teamMembers: validMembers, formResponse: enrichedForm });
      setSuccess("Hackathon registration successful! Your ticket QR has been sent to your email.");
      setTimeout(() => { checkMyRegistration(); loadEvent(); }, 2500);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    }
  };

  const handleUploadProof = async () => {
    if (!myRegistration || !proofFile) return;
    setUploadingProof(true);
    try {
      const fd = new FormData();
      fd.append("paymentProof", proofFile);
      await api.post(`/payments/${myRegistration._id}/upload-proof`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("Payment proof uploaded! Awaiting organizer approval.");
      checkMyRegistration();
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploadingProof(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (!event) return <div style={{ padding: "2rem" }}>Event not found</div>;

  const now = new Date();
  const isParticipant = user?.role === "participant";
  const deadlinePassed = new Date(event.registrationDeadline) <= now;
  const limitReached = (event.currentRegistrations || 0) >= event.registrationLimit;
  const outOfStock = event.eventType === "merchandise" && (event.merchItems?.[0]?.stockQty || 0) <= 0;

  let regBlock = "";
  if (!isParticipant) regBlock = "Login as participant to register";
  else if (myRegistration) regBlock = "already";
  else if (event.status !== "published" && event.status !== "ongoing") regBlock = "not_open";
  else if (deadlinePassed) regBlock = "deadline";
  else if (limitReached) regBlock = "full";
  else if (outOfStock) regBlock = "stock";

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.5rem" }}>{event.eventName}</h1>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ background: "#e8f0fe", padding: "0.3rem 0.7rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "600" }}>
            {event.eventType === "normal" ? "Normal" : event.eventType === "merchandise" ? "Merchandise" : "Hackathon"}
          </span>
          <span style={{ background: "#e8f5e9", padding: "0.3rem 0.7rem", borderRadius: "20px", fontSize: "0.85rem" }}>
            {event.status}
          </span>
          {event.eventTags?.map(tag => (
            <span key={tag} style={{ background: "#f0f0f0", padding: "0.3rem 0.7rem", borderRadius: "20px", fontSize: "0.8rem" }}>{tag}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        {/* Left Column */}
        <div>
          <section style={{ marginBottom: "1.5rem" }}>
            <h2>About</h2>
            <p style={{ lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{event.eventDescription}</p>
          </section>

          <section style={{ marginBottom: "1.5rem" }}>
            <h2>Details</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              {[
                ["Eligibility", event.eligibility],
                ["Registration Deadline", new Date(event.registrationDeadline).toLocaleString()],
                ["Event Start", new Date(event.eventStartDate).toLocaleString()],
                ["Event End", new Date(event.eventEndDate).toLocaleString()],
                ["Registration Limit", `${event.currentRegistrations || 0} / ${event.registrationLimit}`],
                ...(event.eventType === "normal" ? [["Registration Fee", `₹${event.registrationFee || 0}`]] : []),
                ...(event.eventType === "hackathon" ? [["Team Size", `${event.minTeamSize || 1}–${event.maxTeamSize || 4} members`]] : []),
                ...(event.organizerId ? [["Organizer", `${event.organizerId.organizerName} (${event.organizerId.category})`]] : []),
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: "0.5rem", fontWeight: "600", color: "#555", width: "40%", borderBottom: "1px solid #f0f0f0" }}>{k}</td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #f0f0f0" }}>{v}</td>
                </tr>
              ))}
            </table>
          </section>

          {/* Hackathon: Team Member Input */}
          {event.eventType === "hackathon" && !myRegistration && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h2>Team Members</h2>
              <p style={{ color: "#666", fontSize: "0.9rem" }}>
                Min: {event.minTeamSize || 1} · Max: {event.maxTeamSize || 4} members
              </p>
              {teamMembers.map((member, idx) => (
                <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input
                    type="text"
                    value={member}
                    placeholder={`Member ${idx + 1} name or email`}
                    onChange={e => setTeamMembers(prev => prev.map((m, i) => i === idx ? e.target.value : m))}
                    style={{ flex: 1, padding: "0.5rem", borderRadius: "4px", border: "1px solid #ddd" }}
                  />
                  {teamMembers.length > (event.minTeamSize || 1) && (
                    <button type="button" onClick={() => setTeamMembers(prev => prev.filter((_, i) => i !== idx))}
                      style={{ padding: "0.3rem 0.6rem", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>✕</button>
                  )}
                </div>
              ))}
              {teamMembers.length < (event.maxTeamSize || 4) && (
                <button type="button" onClick={() => setTeamMembers(prev => [...prev, ""])}
                  style={{ padding: "0.4rem 0.8rem", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                  + Add Member
                </button>
              )}
            </section>
          )}

          {/* Normal Event: Custom Form */}
          {event.eventType === "normal" && event.formSchema?.length > 0 && !myRegistration && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h2>Registration Form</h2>
              {event.formSchema.map((field) => (
                <div key={field.fieldId} style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "500" }}>
                    {field.label} {field.required && <span style={{ color: "#dc3545" }}>*</span>}
                  </label>
                  {field.type === "text" && <input type="text" required={field.required} onChange={e => setFormData(p => ({ ...p, [field.fieldId]: e.target.value }))} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />}
                  {field.type === "email" && <input type="email" required={field.required} onChange={e => setFormData(p => ({ ...p, [field.fieldId]: e.target.value }))} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />}
                  {field.type === "number" && <input type="number" required={field.required} onChange={e => setFormData(p => ({ ...p, [field.fieldId]: e.target.value }))} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />}
                  {field.type === "textarea" && <textarea required={field.required} rows={3} onChange={e => setFormData(p => ({ ...p, [field.fieldId]: e.target.value }))} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />}
                  {field.type === "dropdown" && (
                    <select required={field.required} onChange={e => setFormData(p => ({ ...p, [field.fieldId]: e.target.value }))} style={{ width: "100%", padding: "0.5rem" }}>
                      <option value="">Select...</option>
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {field.type === "checkbox" && (
                    <label><input type="checkbox" required={field.required} onChange={e => setFormData(p => ({ ...p, [field.fieldId]: e.target.checked }))} /> {field.label}</label>
                  )}
                  {field.type === "file" && (
                    <input type="file" required={field.required} onChange={e => setFileUploads(p => ({ ...p, [field.fieldId]: e.target.files[0] }))} />
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Merchandise: Item Selection */}
          {event.eventType === "merchandise" && !myRegistration && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h2>Select Items</h2>
              {event.merchItems?.map((item, idx) => (
                <div key={idx} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem", marginBottom: "1rem" }}>
                  <h3>{item.itemName}</h3>
                  <p>Stock: {item.stockQty} remaining | Limit: {item.purchaseLimitPerParticipant}/person</p>
                  {item.variants?.map(variant => (
                    <div key={variant.name} style={{ marginBottom: "0.5rem" }}>
                      <label><strong>{variant.name}:</strong></label>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
                        {variant.values.map(val => (
                          <button key={val} type="button" onClick={() => setSelectedVariants(p => ({ ...p, [variant.name]: val }))}
                            style={{
                              padding: "0.3rem 0.7rem", borderRadius: "4px", cursor: "pointer",
                              border: selectedVariants[variant.name] === val ? "2px solid #007bff" : "1px solid #ddd",
                              background: selectedVariants[variant.name] === val ? "#e8f0fe" : "white",
                            }}>{val}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: "0.5rem" }}>
                    <label>Quantity: </label>
                    <input type="number" value={quantity} min={1} max={item.purchaseLimitPerParticipant}
                      onChange={e => setQuantity(Number(e.target.value))}
                      style={{ width: "60px", padding: "0.3rem", marginLeft: "0.5rem" }} />
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* My Registration Status */}
          {myRegistration && (
            <section style={{ marginBottom: "1.5rem", background: "#e8f5e9", padding: "1rem", borderRadius: "8px", border: "1px solid #c3e6cb" }}>
              <h3 style={{ margin: "0 0 0.5rem" }}>You are registered!</h3>
              <p>Ticket ID: <Link to={`/registrations/${myRegistration._id}`} style={{ fontFamily: "monospace" }}>{myRegistration.ticketId}</Link></p>
              <p>Status: <strong>{myRegistration.status.replace(/_/g, " ")}</strong></p>
              {event.eventType === "hackathon" && myRegistration.teamMembers?.length > 0 && (
                <p>Team: {myRegistration.teamMembers.join(", ")}</p>
              )}
              {event.eventType === "merchandise" && myRegistration.status === "registered" && !myRegistration.purchase?.paymentProof && (
                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fff3cd", borderRadius: "6px" }}>
                  <p><strong>Upload payment proof to complete your order:</strong></p>
                  <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files[0])} />
                  <button onClick={handleUploadProof} disabled={uploadingProof || !proofFile}
                    style={{ marginLeft: "0.5rem", padding: "0.4rem 0.8rem", cursor: "pointer" }}>
                    {uploadingProof ? "Uploading..." : "Upload"}
                  </button>
                </div>
              )}
              {myRegistration.status === "pending_approval" && (
                <p style={{ color: "#856404" }}>Payment proof submitted, awaiting organizer approval.</p>
              )}
              {myRegistration.status === "payment_rejected" && (
                <p style={{ color: "#721c24" }}>Payment rejected. Please re-submit or contact organizer.</p>
              )}
            </section>
          )}
        </div>

        {/* Right Panel: Registration */}
        <div>
          <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1.5rem", position: "sticky", top: "1rem", background: "white" }}>
            {myRegistration ? (
              <Link to={`/registrations/${myRegistration._id}`}
                style={{ display: "block", textAlign: "center", padding: "0.75rem", background: "#28a745", color: "white", borderRadius: "6px", textDecoration: "none" }}>
                View Ticket
              </Link>
            ) : regBlock === "not_open" ? (
              <div style={{ textAlign: "center", color: "#666" }}>Event not open for registration</div>
            ) : regBlock === "deadline" ? (
              <div style={{ textAlign: "center", padding: "0.75rem", background: "#f8d7da", borderRadius: "6px", color: "#721c24" }}>Registration closed</div>
            ) : regBlock === "full" ? (
              <div style={{ textAlign: "center", padding: "0.75rem", background: "#f8d7da", borderRadius: "6px", color: "#721c24" }}>Event full</div>
            ) : regBlock === "stock" ? (
              <div style={{ textAlign: "center", padding: "0.75rem", background: "#f8d7da", borderRadius: "6px", color: "#721c24" }}>Out of stock</div>
            ) : regBlock === "already" ? null : (
              <button
                onClick={
                  event.eventType === "normal" ? handleRegisterNormal
                    : event.eventType === "hackathon" ? handleRegisterHackathon
                      : handlePurchaseMerch
                }
                style={{ width: "100%", padding: "0.75rem", background: "#007bff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "1rem", fontWeight: "600" }}>
                {event.eventType === "merchandise" ? "🛒 Purchase" : "📝 Register"}
              </button>
            )}

            {error && <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f8d7da", borderRadius: "6px", color: "#721c24" }}>{error}</div>}
            {success && <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#d4edda", borderRadius: "6px", color: "#155724" }}>{success}</div>}
          </div>

          {event.organizerId && (
            <div style={{ marginTop: "1rem", border: "1px solid #ddd", borderRadius: "8px", padding: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem" }}>Organizer</h3>
              <p style={{ margin: "0.25rem 0" }}><strong>{event.organizerId.organizerName}</strong></p>
              <p style={{ margin: "0.25rem 0", color: "#666", fontSize: "0.9rem" }}>{event.organizerId.category}</p>
              <Link to={`/organizers/${event.organizerId._id}`} style={{ fontSize: "0.85rem" }}>View organizer →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Discussion Forum: Only visible if registered */}
      {myRegistration && myRegistration.status === "registered" && (
        <div style={{ marginTop: "2rem" }}>
          <DiscussionForum eventId={event._id} isOrganizer={false} />
        </div>
      )}

      <Link to="/events" style={{ display: "inline-block", marginTop: "2rem", color: "#007bff" }}>← Back to Events</Link>
    </div>
  );
}
