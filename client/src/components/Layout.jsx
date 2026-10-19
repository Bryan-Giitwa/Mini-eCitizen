import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import ContactWidget from "./ContactWidget";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const firstName = user?.name.trim().split(/\s+/)[0] || "";

  return (
    <>
      <header className="navbar">
        <div className="container navbar__inner">
          <Link to="/" className="brand">
            <span className="brand__mark">H</span> Huduma Hub
          </Link>

          <nav className="navbar__links">
            {user?.role === "citizen" && (
              <>
                <NavLink to="/" end>
                  My Requests
                </NavLink>
                <NavLink to="/requests/new">New Request</NavLink>
              </>
            )}
            {user?.role === "admin" && (
              <>
                <NavLink to="/admin">Admin Dashboard</NavLink>
                <NavLink to="/admin/users/new">Add User</NavLink>
              </>
            )}
          </nav>

          <div className="navbar__user">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="navbar__profile"
                  aria-label={`View profile for ${firstName}`}
                  title="Edit profile"
                >
                  <span className="navbar__profile-mark" aria-hidden="true">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                  <span className="navbar__profile-name">{firstName}</span>
                </Link>
                <button
                  className="btn btn--logout btn--sm"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn--ghost btn--sm">
                  Log in
                </Link>
                <Link to="/register" className="btn btn--primary btn--sm">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container page">
        <Outlet />
      </main>

      <footer className="footer">
        Huduma Hub · Report it. Track it. See it fixed.
      </footer>
      <ContactWidget />
    </>
  );
}
