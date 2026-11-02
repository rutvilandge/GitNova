import { useState, type FormEvent } from "react";
import { ArrowLeft, GitFork } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../../components/brand/Brand";
import WorkspaceIllustration from "../../components/illustrations/WorkspaceIllustration";
import { apiUrl, csrfHeaders, responseError } from "../../lib/api";

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = new FormData(event.currentTarget);
    try {
      const headers = await csrfHeaders();
      const response = await fetch(apiUrl("/api/v1/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.get("email"),
          password: values.get("password"),
        }),
      });
      if (!response.ok)
        throw new Error(
          await responseError(response, "Sign-in is unavailable right now."),
        );
      navigate("/dashboard");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not reach GITNOVA. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-left">
        <Brand />
        <form className="auth-form" onSubmit={submit}>
          <Link to="/" className="auth-back">
            <ArrowLeft size={13} /> Back to home
          </Link>
          <h1 className="auth-title">Welcome back.</h1>
          <p className="auth-desc">
            Sign in to pick up where your team left off.
          </p>
          <label className="field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@company.com"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              placeholder="Enter your password"
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={busy}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
          <a
            className="button button-quiet auth-submit"
            href={apiUrl("/oauth2/authorization/github")}
          >
            <GitFork size={15} /> Continue with GitHub
          </a>
          <p className="auth-foot">
            New to GITNOVA? <Link to="/signup">Create an account</Link>
          </p>
        </form>
        <span className="auth-foot">
          Secure access to your engineering workspace.
        </span>
      </section>
      <aside className="auth-side">
        <div className="auth-side-art-wrap" aria-hidden="true">
          <WorkspaceIllustration className="auth-workspace-illustration" />
          <div className="auth-art-label">REPOSITORY CONTEXT <span>LIVE MAP</span></div>
          <div className="auth-art-chip"><i /> Changes connected</div>
        </div>
        <div className="auth-quote">
          <div className="auth-quote-mark">“</div>
          <p>
            Great software teams move faster when they can see the whole
            picture.
          </p>
          <small>GITNOVA — repository intelligence</small>
        </div>
      </aside>
    </main>
  );
}
