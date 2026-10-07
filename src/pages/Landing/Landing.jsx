import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <main className="landing">
      <div className="landing-content">
        <div className="logo">🌱 SANKALPO</div>

        <h1 className="hero-title">
          Small Actions.
          <br />
          <span>Real Impact.</span>
        </h1>

        <p className="hero-text">
          Make one meaningful environmental action every week,
          earn Eco-Coins, and help create measurable change in your community.
        </p>

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