import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";

export function DiscussionForum({ eventId, isOrganizer }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const loadMessages = useCallback(async () => {
        try {
            const res = await api.get(`/forum/events/${eventId}`);
            setMessages(res.data.messages);
        } catch (e) {
            console.error("Failed to load forum messages", e);
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds for real-time feel
        return () => clearInterval(interval);
    }, [loadMessages]);

    const handlePost = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        try {
            await api.post(`/forum/events/${eventId}`, { content: newMessage });
            setNewMessage("");
            loadMessages();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to post message");
        }
    };

    const handlePin = async (msgId) => {
        try {
            await api.post(`/forum/messages/${msgId}/pin`);
            loadMessages();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to pin");
        }
    };

    const handleDelete = async (msgId) => {
        if (!confirm("Delete this message?")) return;
        try {
            await api.delete(`/forum/messages/${msgId}`);
            loadMessages();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete");
        }
    };

    if (loading) return <div>Loading discussion...</div>;

    return (
        <div style={{ border: "1px solid #ddd", borderRadius: "8px", background: "white", padding: "1.5rem" }}>
            <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Discussion Forum</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto", marginBottom: "1rem", paddingRight: "0.5rem" }}>
                {messages.length === 0 ? (
                    <p style={{ color: "#888", textAlign: "center", fontStyle: "italic" }}>No messages yet. Start the discussion!</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg._id} style={{
                            border: msg.isPinned ? "2px solid #007bff" : "1px solid #eee",
                            borderRadius: "8px",
                            padding: "1rem",
                            background: msg.isPinned ? "#f8fbff" : "#fafafa",
                            position: "relative"
                        }}>
                            {msg.isPinned && <div style={{ position: "absolute", top: "-10px", right: "10px", background: "#007bff", color: "white", padding: "0.2rem 0.5rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>📌 Pinned</div>}

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                <div>
                                    <strong style={{ color: msg.authorId.organizerName ? "#28a745" : "#333" }}>
                                        {msg.authorId.organizerName || `${msg.authorId.firstName} ${msg.authorId.lastName}`}
                                    </strong>
                                    {msg.authorId.organizerName && <span style={{ marginLeft: "0.5rem", background: "#28a745", color: "white", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "bold" }}>Organizer</span>}
                                </div>
                                <div style={{ color: "#888", fontSize: "0.8rem" }}>
                                    {new Date(msg.createdAt).toLocaleString()}
                                </div>
                            </div>

                            <p style={{ margin: "0.5rem 0", whiteSpace: "pre-wrap" }}>{msg.content}</p>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", justifyContent: "flex-end" }}>
                                {isOrganizer && (
                                    <button onClick={() => handlePin(msg._id)} style={{ background: "transparent", border: "1px solid #ddd", padding: "0.2rem 0.6rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}>
                                        {msg.isPinned ? "Unpin" : "Pin"}
                                    </button>
                                )}
                                {(isOrganizer || user?.id === msg.authorId._id) && (
                                    <button onClick={() => handleDelete(msg._id)} style={{ background: "transparent", border: "1px solid #dc3545", color: "#dc3545", padding: "0.2rem 0.6rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}>
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handlePost} style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    style={{ flex: 1, padding: "0.75rem", borderRadius: "6px", border: "1px solid #ccc" }}
                    required
                />
                <button type="submit" style={{ padding: "0.75rem 1.5rem", background: "#007bff", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                    Post
                </button>
            </form>
        </div>
    );
}
