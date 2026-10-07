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
          Take one meaningful environmental challenge every week,
          earn Eco-Coins, and help create measurable change in your community.
        </p>

        <Link to="/register" className="primary-button">
          Start Your Journey →
        </Link>

        <p style={{ marginTop: "20px" }}>
          Already participating?{" "}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}