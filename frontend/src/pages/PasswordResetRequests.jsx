import { useEffect, useState } from "react";
import api from "../utils/api";

export function PasswordResetRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get("/password-reset");
      setRequests(res.data.requests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      const res = await api.post(`/password-reset/${id}/approve`, { comment });
      setMessage(`Request approved! New password: ${res.data.password}`);
      setComment("");
      loadRequests();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to approve");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id) => {
    if (!comment.trim()) {
      setMessage("Comment is required for rejection");
      return;
    }
    setRejectingId(id);
    try {
      await api.post(`/password-reset/${id}/reject`, { comment });
      setMessage("Request rejected");
      setComment("");
      loadRequests();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to reject");
    } finally {
      setRejectingId(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Password Reset Requests</h1>
      {message && (
        <div style={{ color: message.includes("approved") ? "green" : "red", marginBottom: "1rem", padding: "0.5rem", background: "#f0f0f0" }}>
          {message}
        </div>
      )}

      {requests.length === 0 ? (
        <p>No password reset requests</p>
      ) : (
        <div>
          {requests.map((req) => (
            <div key={req._id} style={{ border: "1px solid #ddd", padding: "1rem", marginBottom: "1rem" }}>
              <h3>{req.organizerId?.organizerName}</h3>
              <p>Email: {req.organizerId?.email}</p>
              <p>Reason: {req.reason}</p>
              <p>Status: {req.status}</p>
              <p>Requested: {new Date(req.createdAt).toLocaleString()}</p>
              {req.adminComment && <p>Admin Comment: {req.adminComment}</p>}
              {req.status === "pending" && (
                <div style={{ marginTop: "1rem" }}>
                  <textarea
                    placeholder="Comment (required for rejection)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", marginBottom: "0.5rem" }}
                  />
                  <button
                    onClick={() => handleApprove(req._id)}
                    disabled={approvingId === req._id}
                    style={{ marginRight: "0.5rem", padding: "0.5rem 1rem", background: "green", color: "white", border: "none", cursor: "pointer" }}
                  >
                    {approvingId === req._id ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(req._id)}
                    disabled={rejectingId === req._id || !comment.trim()}
                    style={{ padding: "0.5rem 1rem", background: "red", color: "white", border: "none", cursor: "pointer" }}
                  >
                    {rejectingId === req._id ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
