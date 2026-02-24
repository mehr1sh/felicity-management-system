import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { nanoid } from "nanoid";

const FIELD_TYPES = ["text", "dropdown", "checkbox", "file", "textarea", "number", "email"];
const CATEGORIES = ["Technical", "Cultural", "Sports", "Literary", "Miscellaneous"];

function generateId() {
  return "field_" + Math.random().toString(36).substr(2, 8);
}

export function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    eventName: "",
    eventDescription: "",
    eventType: "normal",
    eligibility: "",
    registrationDeadline: "",
    eventStartDate: "",
    eventEndDate: "",
    registrationLimit: 100,
    registrationFee: 0,
    eventTags: [],
    isTeamEvent: false,
    minTeamSize: 2,
    maxTeamSize: 4,
  });
  const [tagInput, setTagInput] = useState("");
  const [formSchema, setFormSchema] = useState([]);
  const [merchItems, setMerchItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // Tag management
  const addTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim();
      if (tag && !formData.eventTags.includes(tag)) {
        setFormData(prev => ({ ...prev, eventTags: [...prev.eventTags, tag] }));
      }
      setTagInput("");
    }
  };

  // Form fields management
  const addFormField = () => {
    setFormSchema(prev => [...prev, { fieldId: generateId(), label: "", type: "text", required: false, options: [] }]);
  };

  const updateFormField = (idx, updates) => {
    setFormSchema(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const removeFormField = (idx) => {
    setFormSchema(prev => prev.filter((_, i) => i !== idx));
  };

  const moveField = (idx, dir) => {
    setFormSchema(prev => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  // Merchandise items management
  const addMerchItem = () => {
    setMerchItems(prev => [...prev, { itemName: "", variants: [{ name: "Size", values: ["S", "M", "L", "XL"] }], stockQty: 100, purchaseLimitPerParticipant: 2, price: 0 }]);
  };

  const updateMerchItem = (idx, updates) => {
    setMerchItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const removeMerchItem = (idx) => {
    setMerchItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addVariant = (itemIdx) => {
    setMerchItems(prev => prev.map((item, i) => i === itemIdx
      ? { ...item, variants: [...item.variants, { name: "", values: [] }] }
      : item
    ));
  };

  const handleSubmit = async (e, saveAsDraft = true) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = {
        ...formData,
        registrationDeadline: new Date(formData.registrationDeadline).toISOString(),
        eventStartDate: new Date(formData.eventStartDate).toISOString(),
        eventEndDate: new Date(formData.eventEndDate).toISOString(),
        registrationLimit: Number(formData.registrationLimit),
        registrationFee: Number(formData.registrationFee),
        formSchema,
        ...(formData.eventType === "merchandise" ? { merchItems } : {}),
        ...(formData.eventType === "hackathon" ? { isTeamEvent: true, minTeamSize: Number(formData.minTeamSize), maxTeamSize: Number(formData.maxTeamSize) } : {}),
      };

      const res = await api.post("/events", data);
      const eventId = res.data.event._id;

      // Immediately publish if requested
      if (!saveAsDraft) {
        await api.post(`/events/${eventId}/publish`);
      }

      navigate(`/events/${eventId}/manage`);
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Create Event</h1>
      {error && <div style={{ color: "white", background: "#dc3545", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>{error}</div>}

      <form onSubmit={(e) => handleSubmit(e, true)}>
        {/* Basic Info */}
        <section style={{ marginBottom: "1.5rem", padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h2 style={{ marginTop: 0 }}>Basic Information</h2>

          <div style={{ marginBottom: "1rem" }}>
            <label>Event Name *</label>
            <input type="text" name="eventName" value={formData.eventName} onChange={handleChange} required
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Description *</label>
            <textarea name="eventDescription" value={formData.eventDescription} onChange={handleChange} required rows={4}
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label>Event Type *</label>
              <select name="eventType" value={formData.eventType} onChange={handleChange} required
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                <option value="normal">Normal Event</option>
                <option value="merchandise">Merchandise Event</option>
                <option value="hackathon">Hackathon</option>
              </select>
            </div>
            <div>
              <label>Eligibility *</label>
              <select name="eligibility" value={formData.eligibility} onChange={handleChange} required
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}>
                <option value="">Select...</option>
                <option value="IIIT Students Only">IIIT Students Only</option>
                <option value="Open to All">Open to All</option>
                <option value="IIIT Students & Alumni">IIIT Students & Alumni</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label>Registration Deadline *</label>
              <input type="datetime-local" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} required
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
            </div>
            <div>
              <label>Event Start Date *</label>
              <input type="datetime-local" name="eventStartDate" value={formData.eventStartDate} onChange={handleChange} required
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
            </div>
            <div>
              <label>Event End Date *</label>
              <input type="datetime-local" name="eventEndDate" value={formData.eventEndDate} onChange={handleChange} required
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label>Registration Limit *</label>
              <input type="number" name="registrationLimit" value={formData.registrationLimit} onChange={handleChange} required min={1}
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
            </div>
            {formData.eventType === "normal" && (
              <div>
                <label>Registration Fee (₹)</label>
                <input type="number" name="registrationFee" value={formData.registrationFee} onChange={handleChange} min={0}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
              </div>
            )}
          </div>

          {formData.eventType === "hackathon" && (
            <div style={{ marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label>Min Team Size</label>
                <input type="number" name="minTeamSize" value={formData.minTeamSize} onChange={handleChange} min={1}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
              </div>
              <div>
                <label>Max Team Size</label>
                <input type="number" name="maxTeamSize" value={formData.maxTeamSize} onChange={handleChange} min={1}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} />
              </div>
            </div>
          )}

          <div>
            <label>Tags (press Enter or comma to add)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px", marginTop: "0.25rem" }}>
              {formData.eventTags.map(tag => (
                <span key={tag} style={{ background: "#e8f0fe", padding: "0.2rem 0.5rem", borderRadius: "20px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  {tag}
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, eventTags: prev.eventTags.filter(t => t !== tag) }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#666", padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
              <input
                type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                placeholder="Add tag..." style={{ border: "none", outline: "none", minWidth: "100px", padding: "0.2rem" }}
              />
            </div>
          </div>
        </section>

        {/* Custom Form Builder - Normal & Hackathon only */}
        {(formData.eventType === "normal" || formData.eventType === "hackathon") && (
          <section style={{ marginBottom: "1.5rem", padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0 }}>Custom Registration Form</h2>
              <button type="button" onClick={addFormField}
                style={{ padding: "0.4rem 0.8rem", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                + Add Field
              </button>
            </div>

            {formSchema.length === 0 && <p style={{ color: "#888" }}>No custom fields. Click "Add Field" to create a registration form.</p>}

            {formSchema.map((field, idx) => (
              <div key={field.fieldId} style={{ border: "1px solid #e0e0e0", borderRadius: "6px", padding: "1rem", marginBottom: "0.75rem", background: "#fafafa" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto auto", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="text" value={field.label} placeholder="Field Label" required
                    onChange={e => updateFormField(idx, { label: e.target.value })}
                    style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #ddd" }}
                  />
                  <select value={field.type} onChange={e => updateFormField(idx, { type: e.target.value })}
                    style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #ddd" }}>
                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={field.required} onChange={e => updateFormField(idx, { required: e.target.checked })} />
                    Required
                  </label>
                  <button type="button" onClick={() => moveField(idx, -1)} disabled={idx === 0}
                    style={{ padding: "0.3rem 0.5rem", cursor: "pointer" }}>↑</button>
                  <button type="button" onClick={() => moveField(idx, 1)} disabled={idx === formSchema.length - 1}
                    style={{ padding: "0.3rem 0.5rem", cursor: "pointer" }}>↓</button>
                  <button type="button" onClick={() => removeFormField(idx)}
                    style={{ padding: "0.3rem 0.6rem", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>✕</button>
                </div>

                {(field.type === "dropdown") && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem" }}>Options (comma-separated):</label>
                    <input type="text"
                      value={field.optionsText !== undefined ? field.optionsText : (field.options?.join(", ") || "")}
                      onChange={e => updateFormField(idx, { optionsText: e.target.value })}
                      onBlur={e => {
                        const parsed = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                        updateFormField(idx, { options: parsed, optionsText: parsed.join(", ") });
                      }}
                      placeholder="Option 1, Option 2, Option 3"
                      style={{ width: "100%", padding: "0.4rem", marginTop: "0.25rem", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box" }}
                    />
                    {field.options?.length > 0 && (
                      <div style={{ marginTop: "0.25rem", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {field.options.map(opt => (
                          <span key={opt} style={{ background: "#e8f0fe", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}>{opt}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Merchandise Section */}
        {formData.eventType === "merchandise" && (
          <section style={{ marginBottom: "1.5rem", padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0 }}>Merchandise Items</h2>
              <button type="button" onClick={addMerchItem}
                style={{ padding: "0.4rem 0.8rem", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                + Add Item
              </button>
            </div>

            {merchItems.length === 0 && <p style={{ color: "#888" }}>No items. Click "Add Item" to add merchandise.</p>}

            {merchItems.map((item, idx) => (
              <div key={idx} style={{ border: "1px solid #e0e0e0", borderRadius: "6px", padding: "1rem", marginBottom: "0.75rem", background: "#fafafa" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.85rem" }}>Item Name</label>
                    <input type="text" value={item.itemName} onChange={e => updateMerchItem(idx, { itemName: e.target.value })}
                      placeholder="e.g. Felicity T-Shirt" style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid #ddd" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem" }}>Price (₹)</label>
                    <input type="number" value={item.price || 0} onChange={e => updateMerchItem(idx, { price: Number(e.target.value) })}
                      min={0} style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid #ddd" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem" }}>Stock Qty</label>
                    <input type="number" value={item.stockQty} onChange={e => updateMerchItem(idx, { stockQty: Number(e.target.value) })}
                      min={0} style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid #ddd" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.85rem" }}>Purchase Limit/Person</label>
                    <input type="number" value={item.purchaseLimitPerParticipant} onChange={e => updateMerchItem(idx, { purchaseLimitPerParticipant: Number(e.target.value) })}
                      min={1} style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid #ddd" }} />
                  </div>
                  <button type="button" onClick={() => removeMerchItem(idx)}
                    style={{ alignSelf: "flex-end", padding: "0.4rem 0.6rem", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>✕</button>
                </div>

                {/* Variants */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: "600" }}>Variants</label>
                    <button type="button" onClick={() => addVariant(idx)}
                      style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", cursor: "pointer" }}>+ Variant</button>
                  </div>
                  {item.variants.map((variant, vIdx) => (
                    <div key={vIdx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
                      <input type="text" value={variant.name} placeholder="e.g. Size"
                        onChange={e => {
                          const newVariants = [...item.variants];
                          newVariants[vIdx] = { ...variant, name: e.target.value };
                          updateMerchItem(idx, { variants: newVariants });
                        }}
                        style={{ width: "150px", padding: "0.3rem", borderRadius: "4px", border: "1px solid #ddd" }} />
                      <input type="text" value={variant.values.join(", ")} placeholder="S, M, L, XL"
                        onChange={e => {
                          const newVariants = [...item.variants];
                          newVariants[vIdx] = { ...variant, values: e.target.value.split(",").map(s => s.trim()).filter(Boolean) };
                          updateMerchItem(idx, { variants: newVariants });
                        }}
                        style={{ flex: 1, padding: "0.3rem", borderRadius: "4px", border: "1px solid #ddd" }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Submit Buttons */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <button type="submit" disabled={loading}
            style={{ padding: "0.75rem 1.5rem", background: "#6c757d", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "1rem" }}>
            {loading ? "Saving..." : "Save as Draft"}
          </button>
          <button type="button" disabled={loading} onClick={(e) => handleSubmit(e, false)}
            style={{ padding: "0.75rem 1.5rem", background: "#28a745", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "1rem" }}>
            {loading ? "Publishing..." : "Save & Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
