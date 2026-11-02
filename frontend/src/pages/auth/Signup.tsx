import { useState, type FormEvent } from "react";
import { ArrowLeft, GitFork } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../../components/brand/Brand";
import WorkspaceIllustration from "../../components/illustrations/WorkspaceIllustration";
import { apiUrl, csrfHeaders, responseError } from "../../lib/api";

export default function Signup() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password"));
    if (password !== values.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const headers = await csrfHeaders();
      const response = await fetch(apiUrl("/api/v1/auth/register"), {
        method: "POST",
        credentials: "include",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          password,
        }),
      });
      if (!response.ok)
        throw new Error(
          await responseError(
            response,
            "Account creation is unavailable right now.",
          ),
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
          <h1 className="auth-title">Build with clarity.</h1>
          <p className="auth-desc">
            Create your GITNOVA account and connect your engineering workspace.
          </p>
          <label className="field">
            <span>Your name</span>
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={100}
              placeholder="Ada Lovelace"
            />
          </label>
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
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              placeholder="At least 12 characters"
            />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              placeholder="Enter your password again"
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
            {busy ? "Creating account..." : "Create account"}
          </button>
          <a
            className="button button-quiet auth-submit"
            href={apiUrl("/oauth2/authorization/github")}
          >
            <GitFork size={15} /> Sign up with GitHub
          </a>
          <p className="auth-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
        <span className="auth-foot">
          By continuing, you agree to use GITNOVA responsibly.
        </span>
      </section>
      <aside className="auth-side">
        <div className="auth-side-art-wrap" aria-hidden="true">
          <WorkspaceIllustration className="auth-workspace-illustration" />
          <div className="auth-art-label">REPOSITORY CONTEXT <span>LIVE MAP</span></div>
          <div className="auth-art-chip"><i /> Changes connected</div>
        </div>
        <div className="auth-quote">
          <div className="auth-quote-mark">✳</div>
          <p>Bring the context around your code closer to the work.</p>
          <small>One connected view for your team.</small>
        </div>
      </aside>
    </main>
  );
}
