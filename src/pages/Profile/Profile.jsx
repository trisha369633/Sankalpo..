import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import "./Profile.css";

export default function Profile() {
  const { profile } = useAuth();

  const fullName = profile?.full_name || "Sankalpo Member";

  return (
    <main className="profile-page">
      <div className="profile-container">
        <header className="profile-header">
          <div className="profile-avatar" aria-hidden="true">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="profile-eyebrow">YOUR PROFILE</p>
            <h1>{fullName}</h1>
            <p>{profile?.email || "Your Sankalpo account"}</p>
          </div>
        </header>

        <section className="profile-stats" aria-label="Your impact">
          <div>
            <span>Eco-Coins</span>
            <strong>{profile?.eco_coins ?? 0}</strong>
          </div>
          <div>
            <span>Total actions</span>
            <strong>{profile?.total_actions ?? 0}</strong>
          </div>
          <div>
            <span>Trees planted</span>
            <strong>{profile?.trees_planted ?? 0}</strong>
          </div>
          <div>
            <span>Waste cleaned</span>
            <strong>{profile?.waste_cleaned ?? 0}</strong>
          </div>
        </section>

        <section className="profile-account-card">
          <div>
            <p className="profile-eyebrow">ACCOUNT</p>
            <h2>Profile details</h2>
          </div>
          <dl>
            <div>
              <dt>Full name</dt>
              <dd>{fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile?.email || "Not available"}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{profile?.role || "user"}</dd>
            </div>
          </dl>
          <Link className="secondary-button" to="/dashboard">
            Back to dashboard
          </Link>
        </section>
      </div>
    </main>
  );
}
