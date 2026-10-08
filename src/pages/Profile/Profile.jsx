import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  ActionsIcon,
  CoinIcon,
  ProfileIcon,
  TreeIcon,
  WasteIcon,
} from "../../components/SankalpoIcons";
import { useAuth } from "../../context/AuthContext";
import { loadApprovalHistory } from "../../lib/impactService";
import "./Profile.css";

export default function Profile() {
  const { profile, user } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!user) return;
    loadApprovalHistory(user.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [user]);

  const fullName = profile?.full_name || "Sankalpo Member";

  return (
    <main className="profile-page">
      <div className="profile-container">
        <header className="profile-header">
          <div className="profile-avatar" aria-hidden="true">
            <ProfileIcon size={28} strokeWidth={1.7} />
          </div>
          <div>
            <p className="profile-eyebrow">YOUR PROFILE</p>
            <h1>{fullName}</h1>
            <p>{profile?.email || "Your Sankalpo account"}</p>
          </div>
        </header>

        <section className="profile-stats" aria-label="Your impact">
          <div>
            <CoinIcon size={18} strokeWidth={1.8} />
            <span>Eco-Coins</span>
            <strong>{profile?.eco_coins ?? 0}</strong>
          </div>
          <div>
            <ActionsIcon size={18} strokeWidth={1.8} />
            <span>Total actions</span>
            <strong>{profile?.total_actions ?? 0}</strong>
          </div>
          <div>
            <TreeIcon size={18} strokeWidth={1.8} />
            <span>Trees planted</span>
            <strong>{profile?.trees_planted ?? 0}</strong>
          </div>
          <div>
            <WasteIcon size={18} strokeWidth={1.8} />
            <span>Waste cleaned</span>
            <strong>{profile?.waste_cleaned ?? 0}</strong>
          </div>
        </section>

        <section className="profile-history-card">
          <div>
            <p className="profile-eyebrow">ACTIVITY HISTORY</p>
            <h2>Your verification timeline</h2>
          </div>
          {history.length === 0 ? (
            <p className="profile-history-empty">
              No submissions found. Your submission history will appear here.
            </p>
          ) : (
            <ol className="profile-history-list">
              {history.map((submission) => (
                <li key={submission.id}>
                  <span className={`history-status status-${submission.status}`}>
                    {submission.status}
                  </span>
                  <div>
                    <strong>{submission.challenges?.title || "Environmental action"}</strong>
                    <small>
                      {new Date(submission.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </small>
                  </div>
                  {submission.admin_note && (
                    <p>{submission.admin_note}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
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
