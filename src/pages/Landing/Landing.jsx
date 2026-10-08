import { Link } from "react-router-dom";
import { LeafIcon } from "../../components/SankalpoIcons";
import { useVerifiedImpact } from "../../hooks/useVerifiedImpact";
import { formatImpactNumber } from "../../lib/impact";

export default function Landing() {
  const { impact, loading } = useVerifiedImpact();

  return (
    <main className="landing">
      <div className="landing-content">
        <div className="logo">
          <LeafIcon size={26} strokeWidth={1.7} />
          SANKALPO
        </div>

        <h1 className="hero-title">
          Small Actions.
          <br />
          <span>Real Impact.</span>
        </h1>

        <p className="hero-text">
          Make one meaningful environmental action every week,
          earn Eco-Coins, and help create measurable change in your community.
        </p>

        <div className="verified-impact-strip" aria-live="polite">
          <div>
            <strong>{loading ? "—" : formatImpactNumber(impact.actions)}</strong>
            <span>verified actions</span>
          </div>
          <div>
            <strong>{loading ? "—" : formatImpactNumber(impact.trees)}</strong>
            <span>trees funded</span>
          </div>
          <div>
            <strong>{loading ? "—" : formatImpactNumber(impact.wasteKg)}</strong>
            <span>kg waste verified</span>
          </div>
        </div>

        <div className="landing-actions">
          <Link to="/register" className="primary-button">
            Get Started →
          </Link>
          <Link to="/login" className="secondary-link">
            Already a member? Login
          </Link>
        </div>
      </div>
    </main>
  );
}