import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import "./Header.css";

const navigation = [
  { label: "Home", to: "/home" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Challenges", to: "/challenges" },
  { label: "Leaderboard", to: "/leaderboard" },
];

export default function Header() {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = profile?.role === "admin";

  const links = [
    ...navigation,
    ...(isAdmin ? [{ label: "Admin", to: "/admin" }] : []),
    { label: "Profile", to: "/profile" },
  ];

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleLogout() {
    closeMenu();
    await signOut();
  }

  return (
    <header className="global-header">
      <div className="global-header-inner">
        <Link
          className="brand"
          to="/home"
          onClick={closeMenu}
          aria-label="Sankalpo home"
        >
          <span className="brand-mark" aria-hidden="true">
            🌱
          </span>
          <span>SANKALPO</span>
        </Link>

        <nav
          className={`global-nav ${menuOpen ? "is-open" : ""}`}
          aria-label="Primary navigation"
        >
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/home"}
              className={({ isActive }) =>
                `global-nav-link${isActive ? " active" : ""}`
              }
              onClick={closeMenu}
            >
              {item.label}
            </NavLink>
          ))}

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>

        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
