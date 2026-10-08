import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import "./AdminCommunity.css";

const tabs = ["Posts", "Problems", "Reports", "Rewards"];

export default function AdminCommunity() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("Posts");
  const [posts, setPosts] = useState([]);
  const [problems, setProblems] = useState([]);
  const [postReports, setPostReports] = useState([]);
  const [problemReports, setProblemReports] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    if (authLoading || !user || profile?.role !== "admin") return;

    async function loadData() {
      try {
        const [postResult, problemResult, postReportResult, problemReportResult, rewardResult] = await Promise.all([
          supabase.from("community_posts").select("*, author:profiles(full_name)").order("created_at", { ascending: false }),
          supabase.from("environmental_problems").select("*, author:profiles(full_name)").order("created_at", { ascending: false }),
          supabase.from("post_reports").select("*, post:community_posts(title), reporter:profiles(full_name)").order("created_at", { ascending: false }),
          supabase.from("problem_reports").select("*, problem:environmental_problems(title), reporter:profiles(full_name)").order("created_at", { ascending: false }),
          supabase.from("monthly_rewards").select("*, user:profiles(full_name)").order("created_at", { ascending: false }),
        ]);
        if ([postResult, problemResult, postReportResult, problemReportResult, rewardResult].some((result) => result.error)) {
          throw new Error("Unable to load moderation data.");
        }
        setPosts(postResult.data || []);
        setProblems(problemResult.data || []);
        setPostReports(postReportResult.data || []);
        setProblemReports(problemReportResult.data || []);
        setRewards(rewardResult.data || []);
      } catch (err) {
        setError(err.message || "Unable to load moderation data.");
      }
    }

    loadData();
  }, [authLoading, user, profile]);

  if (authLoading) return <main className="admin-community-page"><div className="admin-community-container">Checking access...</div></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role !== "admin") return <Navigate to="/dashboard" replace />;

  async function updatePost(postId, verificationStatus, verificationNote = "") {
    setSavingId(postId);
    setError("");
    try {
      const { error } = await supabase.from("community_posts").update({
        verification_status: verificationStatus,
        verification_note: verificationNote,
        verified_by_id: user.id,
      }).eq("id", postId);
      if (error) throw error;
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, verification_status: verificationStatus } : post));
    } catch (err) {
      setError(err.message || "Unable to update the post.");
    } finally {
      setSavingId("");
    }
  }

  async function updateReport(reportId, status, table) {
    setSavingId(reportId);
    try {
      const { error } = await supabase.from(table).update({ status }).eq("id", reportId);
      if (error) throw error;
      if (table === "post_reports") setPostReports((current) => current.map((item) => item.id === reportId ? { ...item, status } : item));
      else setProblemReports((current) => current.map((item) => item.id === reportId ? { ...item, status } : item));
    } catch (err) {
      setError(err.message || "Unable to update the report.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="admin-community-page">
      <div className="admin-community-container">
        <header className="admin-community-header"><div><p className="admin-community-eyebrow">ADMIN / COMMUNITY</p><h1>Moderation workspace</h1><p>Verify community activity, review reports, and publish monthly rewards.</p></div><span className="admin-community-badge">{profile.full_name || "Administrator"}</span></header>
        {error && <div className="admin-community-error">{error}</div>}
        <div className="admin-community-tabs">{tabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)} type="button">{tab}</button>)}</div>

        {activeTab === "Posts" && <section className="admin-community-section"><h2>Community posts</h2>{posts.length === 0 ? <div className="admin-community-empty">No posts.</div> : posts.map((post) => <article className="admin-community-card" key={post.id}><div><span className={`admin-community-status ${post.verification_status}`}>{post.verification_status}</span><h3>{post.title}</h3><p>{post.description}</p><small>By {post.author?.full_name || "Unknown member"}</small></div><div className="admin-community-actions"><button onClick={() => updatePost(post.id, "verified")} disabled={savingId === post.id} type="button">Verify</button><button className="reject" onClick={() => updatePost(post.id, "rejected", "Content did not meet community standards.")} disabled={savingId === post.id} type="button">Reject</button></div></article>)}</section>}

        {activeTab === "Problems" && <section className="admin-community-section"><h2>Environmental problem reports</h2>{problems.length === 0 ? <div className="admin-community-empty">No problems.</div> : problems.map((problem) => <article className="admin-community-card" key={problem.id}><div><span className={`admin-community-status ${problem.status}`}>{problem.status}</span><h3>{problem.title}</h3><p>{problem.description}</p><small>{problem.location || "Location not provided"}</small></div><div className="admin-community-actions"><button onClick={() => supabase.from("environmental_problems").update({ status: "action_taken" }).eq("id", problem.id)} type="button">Mark action taken</button><button className="reject" onClick={() => supabase.from("environmental_problems").update({ status: "resolved" }).eq("id", problem.id)} type="button">Resolve</button></div></article>)}</section>}

        {activeTab === "Reports" && <section className="admin-community-section"><h2>Reported content and problems</h2><div className="admin-community-report-grid"><div><h3>Post reports</h3>{postReports.map((report) => <article key={report.id}><strong>{report.post?.title || "Post"}</strong><p>{report.reason}</p><span>{report.status}</span><button onClick={() => updateReport(report.id, "reviewed", "post_reports")} disabled={savingId === report.id} type="button">Review</button></article>)}</div><div><h3>Problem reports</h3>{problemReports.map((report) => <article key={report.id}><strong>{report.problem?.title || "Problem"}</strong><p>{report.reason}</p><span>{report.status}</span><button onClick={() => updateReport(report.id, "reviewed", "problem_reports")} disabled={savingId === report.id} type="button">Review</button></article>)}</div></div></section>}

        {activeTab === "Rewards" && <section className="admin-community-section"><h2>Monthly reward publication</h2>{rewards.length === 0 ? <div className="admin-community-empty">No reward records.</div> : rewards.map((reward) => <article className="admin-community-card" key={reward.id}><div><span className={`admin-community-status ${reward.reward_status}`}>{reward.month} · rank {reward.rank}</span><h3>{reward.user?.full_name || "Unknown member"}</h3><p>{reward.reward_note || "Monthly reward"}</p></div><button onClick={() => supabase.from("monthly_rewards").update({ published: true, reward_status: "delivered" }).eq("id", reward.id)} type="button">Publish reward</button></article>)}</section>}
      </div>
    </main>
  );
}
