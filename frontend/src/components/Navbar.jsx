import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  const participantNav = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/events", label: "Browse Events" },
    { to: "/organizers", label: "Clubs/Organizers" },
    { to: "/profile", label: "Profile" },
  ];

  const organizerNav = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/events/create", label: "Create Event" },
    { to: "/organizer/password-resets", label: "Password Reset Requests" },
    { to: "/profile", label: "Profile" },
  ];

  const adminNav = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/admin/organizers", label: "Manage Clubs/Organizers" },
    { to: "/admin/password-resets", label: "Password Reset Requests" },
  ];

  const navItems =
    user.role === "participant"
      ? participantNav
      : user.role === "organizer"
        ? organizerNav
        : adminNav;

  return (
    <nav style={{ padding: "1rem", background: "#f0f0f0", borderBottom: "1px solid #ccc", color: "#333" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" style={{ fontSize: "1.5rem", fontWeight: "bold", textDecoration: "none", color: "#333" }}>
          Felicity EMS
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} style={{ textDecoration: "none", color: "#333" }}>
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
              background: "white",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontWeight: "500",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
