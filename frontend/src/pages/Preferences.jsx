import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

const INTERESTS = [
    "Sports", "Cultural", "Technical", "Literary", "Music", "Dance", "Art",
    "Photography", "Coding", "Robotics", "AI/ML", "Entrepreneurship",
    "Gaming", "Film", "Debate", "Science", "Mathematics", "Design"
];

export function Preferences() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [organizers, setOrganizers] = useState([]);
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [selectedOrganizers, setSelectedOrganizers] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {

        sessionStorage.removeItem("justRegistered");
        api.get("/organizers").then(r => setOrganizers(r.data.organizers)).catch(() => { });
    }, []);

    const toggleInterest = (interest) => {
        setSelectedInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    const toggleOrganizer = (id) => {
        setSelectedOrganizers(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch("/me", {
                interests: selectedInterests,
                followedOrganizers: selectedOrganizers,
            });
            navigate("/dashboard");
        } catch {
            navigate("/dashboard");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: "700px", margin: "2rem auto", padding: "2rem" }}>
            <h1> Set Your Preferences</h1>
            <p style={{ color: "#666", marginBottom: "2rem" }}>
                Personalize your experience! You can always change these from your Profile.
            </p>

            <section style={{ marginBottom: "2rem" }}>
                <h2>Areas of Interest</h2>
                <p style={{ color: "#888", marginBottom: "1rem" }}>Select all that apply:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {INTERESTS.map(interest => (
                        <label key={interest} style={{
                            display: "inline-flex", alignItems: "center", gap: "0.4rem",
                            padding: "0.4rem 0.8rem", border: "2px solid",
                            borderColor: selectedInterests.includes(interest) ? "#007bff" : "#ddd",
                            borderRadius: "20px", cursor: "pointer",
                            background: selectedInterests.includes(interest) ? "#e8f0fe" : "white",
                            fontWeight: selectedInterests.includes(interest) ? "600" : "normal",
                            transition: "all 0.2s"
                        }}>
                            <input
                                type="checkbox"
                                style={{ display: "none" }}
                                checked={selectedInterests.includes(interest)}
                                onChange={() => toggleInterest(interest)}
                            />
                            {interest}
                        </label>
                    ))}
                </div>
            </section>

            <section style={{ marginBottom: "2rem" }}>
                <h2>Clubs/Organizers to Follow</h2>
                <p style={{ color: "#888", marginBottom: "1rem" }}>Follow clubs to see their events first:</p>
                {organizers.length === 0 ? (
                    <p style={{ color: "#999" }}>No organizers available yet</p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
                        {organizers.map(org => (
                            <label key={org._id} style={{
                                display: "flex", alignItems: "flex-start", gap: "0.5rem",
                                padding: "0.75rem", border: "2px solid",
                                borderColor: selectedOrganizers.includes(String(org._id)) ? "#007bff" : "#ddd",
                                borderRadius: "8px", cursor: "pointer",
                                background: selectedOrganizers.includes(String(org._id)) ? "#e8f0fe" : "white",
                                transition: "all 0.2s"
                            }}>
                                <input
                                    type="checkbox"
                                    checked={selectedOrganizers.includes(String(org._id))}
                                    onChange={() => toggleOrganizer(String(org._id))}
                                />
                                <div>
                                    <div style={{ fontWeight: "600" }}>{org.organizerName}</div>
                                    <div style={{ fontSize: "0.8rem", color: "#666" }}>{org.category}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
            </section>

            <div style={{ display: "flex", gap: "1rem" }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: "0.75rem 2rem", background: "#007bff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "1rem" }}
                >
                    {saving ? "Saving..." : "Save & Continue"}
                </button>
                <button
                    onClick={() => navigate("/dashboard")}
                    style={{ padding: "0.75rem 2rem", background: "#f0f0f0", color: "#333", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "1rem" }}
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
}
