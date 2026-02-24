import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";


const IIIT_DOMAINS = ["iiit.ac.in", "students.iiit.ac.in", "research.iiit.ac.in"];

export function Register() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    participantType: "non_iiit", 
    collegeOrOrgName: "",
    contactNumber: "",
    interests: [],
    followedOrganizers: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.participantType === "iiit") {
      
      const emailParts = formData.email.split("@");
      if (emailParts.length < 2) {
        setError("Please enter a valid email address.");
        return;
      }

      const emailDomain = emailParts[1].toLowerCase().trim();

      
      const isValid = IIIT_DOMAINS.some(d => d.toLowerCase().trim() === emailDomain);

      if (!isValid) {
        setError(`Please use a valid IIIT email: ${IIIT_DOMAINS.join(", ")}`);
        return;
      }
    }

    setLoading(true);
    try {
      await register(formData);
      navigate("/preferences");
    } catch (err) {
      
      const backendError = err.response?.data?.error || "Registration failed";
      setError(backendError.includes("undefined")
        ? `Please use a valid IIIT email: ${IIIT_DOMAINS.join(", ")}`
        : backendError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "2rem auto", padding: "2rem" }}>
      <h1>Register as Participant</h1>

      
      {error && (
        <div style={{
          color: "white",
          backgroundColor: "#ff4d4d",
          padding: "0.75rem",
          borderRadius: "4px",
          marginBottom: "1rem"
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label>First Name:</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Last Name:</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="yourname@iiit.ac.in"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
          {formData.participantType === "iiit" && (
            <small style={{ color: "#666", display: "block", marginTop: "0.25rem" }}>
              Allowed: {IIIT_DOMAINS.map(d => `@${d}`).join(", ")}
            </small>
          )}
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Participant Type:</label>
          <select
            name="participantType"
            value={formData.participantType}
            onChange={handleChange}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          >
            <option value="iiit">IIIT Student</option>
            <option value="non_iiit">Non-IIIT Participant</option>
          </select>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>College/Organization Name:</label>
          <input
            type="text"
            name="collegeOrOrgName"
            value={formData.collegeOrOrgName}
            onChange={handleChange}
            required={formData.participantType === "non_iiit"}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label>Contact Number:</label>
          <input
            type="tel"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      <p style={{ marginTop: "1rem", textAlign: "center" }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}