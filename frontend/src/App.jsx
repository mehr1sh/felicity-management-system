import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { BrowseEvents } from "./pages/BrowseEvents";
import { EventDetails } from "./pages/EventDetails";
import { Profile } from "./pages/Profile";
import { Organizers } from "./pages/Organizers";
import { CreateEvent } from "./pages/CreateEvent";
import { AdminOrganizers } from "./pages/AdminOrganizers";
import { OrganizerDetails } from "./pages/OrganizerDetails";
import { TicketView } from "./pages/TicketView";
import { OrganizerEventDetails } from "./pages/OrganizerEventDetails";
import { PasswordResetRequests } from "./pages/PasswordResetRequests";
import { Preferences } from "./pages/Preferences";
import { ForgotPassword } from "./pages/ForgotPassword";
import "./App.css";

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        path="/register"
        element={
          user
            ? sessionStorage.getItem("justRegistered") === "1"
              ? <Navigate to="/preferences" replace />
              : <Navigate to="/dashboard" replace />
            : <Register />
        }
      />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
      <Route path="/preferences" element={<ProtectedRoute allowedRoles={["participant"]}><Preferences /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      <Route path="/events/create" element={<ProtectedRoute allowedRoles={["organizer"]}><CreateEvent /></ProtectedRoute>} />
      <Route path="/events/:id/manage" element={<ProtectedRoute allowedRoles={["organizer"]}><OrganizerEventDetails /></ProtectedRoute>} />
      <Route path="/events/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />
      <Route path="/events" element={<ProtectedRoute><BrowseEvents /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/organizers" element={<ProtectedRoute><Organizers /></ProtectedRoute>} />
      <Route path="/organizers/:id" element={<ProtectedRoute><OrganizerDetails /></ProtectedRoute>} />
      <Route path="/registrations/:id" element={<ProtectedRoute><TicketView /></ProtectedRoute>} />
      <Route path="/admin/organizers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOrganizers /></ProtectedRoute>} />
      <Route path="/admin/password-resets" element={<ProtectedRoute allowedRoles={["admin"]}><PasswordResetRequests /></ProtectedRoute>} />
      <Route path="/organizer/password-resets" element={<ProtectedRoute allowedRoles={["organizer"]}><PasswordResetRequests /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
