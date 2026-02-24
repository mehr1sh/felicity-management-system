import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [reason, setReason] = useState("");
    const [status, setStatus] = useState("idle"); // idle, loading, success, error
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMsg("");

        try {
            await api.post("/password-reset/request", { email, reason });
            setStatus("success");
        } catch (err) {
            setStatus("error");
            setErrorMsg(err.response?.data?.error || "Failed to submit request");
        }
    };

    return (
        <div style={{ maxWidth: "500px", margin: "3rem auto", padding: "2rem", border: "1px solid #ddd", borderRadius: "8px", background: "white" }}>
            <h2 style={{ marginTop: 0 }}>Organizer Password Reset</h2>
            <p style={{ color: "#666", marginBottom: "1.5rem" }}>
                If you are an organizer and have forgotten your password, or have a security concern, submit a request to the admin here.
            </p>

            {status === "success" ? (
                <div style={{ padding: "1rem", background: "#d4edda", color: "#155724", borderRadius: "6px", textAlign: "center" }}>
                    Your password reset request has been submitted to the admin. You will receive an email once it is approved.
                    <br /><br />
                    <Link to="/login" style={{ fontWeight: "600", color: "#155724" }}>Return to Login</Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    {status === "error" && (
                        <div style={{ padding: "0.75rem", background: "#f8d7da", color: "#721c24", borderRadius: "6px", marginBottom: "1rem" }}>
                            {errorMsg}
                        </div>
                    )}

                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "500" }}>Organizer Login Email:</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="e.g. clubs@iiit.ac.in"
                            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
                        />
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                        <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "500" }}>Reason:</label>
                        <select
                            required
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
                        >
                            <option value="">Select a reason...</option>
                            <option value="Forgot password">Forgot password</option>
                            <option value="Security concern / Account compromised">Security concern / Account compromised</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={status === "loading"}
                        style={{ width: "100%", padding: "0.75rem", background: "#007bff", color: "white", border: "none", borderRadius: "6px", fontSize: "1rem", cursor: "pointer", fontWeight: "600" }}
                    >
                        {status === "loading" ? "Submitting..." : "Submit Reset Request"}
                    </button>

                    <div style={{ marginTop: "1rem", textAlign: "center" }}>
                        <Link to="/login" style={{ color: "#007bff", textDecoration: "none" }}>Back to Login</Link>
                    </div>
                </form>
            )}
        </div>
    );
}
