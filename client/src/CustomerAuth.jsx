import { useState } from "react";
import {
  FiMail,
  FiLock,
  FiUser,
  FiPhone,
  FiArrowLeft,
} from "react-icons/fi";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export function CustomerAuth({ onDemoMode }) {
  const [view, setView] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          }
        }
      });
      if (error) throw error;
      setMessage("Verification email sent! Please check your inbox.");
      setView("login");
    } catch (err) {
      setError(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/dashboard",
      });
      if (error) throw error;
      setMessage("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setError(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {!isSupabaseConfigured && (
          <div className="auth-warning-banner">
            <p>
              <strong>Supabase not configured:</strong> Please configure your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in the <code>client/.env</code> file.
            </p>
            <button className="auth-demo-btn" type="button" onClick={onDemoMode}>
              <FiUser /> Enter Demo Mode
            </button>
          </div>
        )}

        <div className="auth-header">
          {view === "login" && (
            <>
              <h2>Sign In</h2>
              <p>Welcome back! Enter your details to continue</p>
            </>
          )}
          {view === "signup" && (
            <>
              <h2>Create Account</h2>
              <p>Join us to track orders, save wishlists, and check out faster</p>
            </>
          )}
          {view === "forgot" && (
            <>
              <h2>Reset Password</h2>
              <p>Enter your email to receive a password reset link</p>
            </>
          )}
        </div>

        {error && <div className="auth-error-box">{error}</div>}
        {message && (
          <div className="status-box success" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
            {message}
          </div>
        )}

        {view === "login" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrapper">
                <FiMail />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured || loading}
                />
              </div>
            </div>
            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrapper">
                <FiLock />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured || loading}
                />
              </div>
            </div>
            <button
              className="auth-submit-btn"
              type="submit"
              disabled={!isSupabaseConfigured || loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <div className="auth-footer">
              <button
                type="button"
                className="auth-toggle-link"
                onClick={() => setView("forgot")}
                disabled={loading}
              >
                Forgot password?
              </button>
              <span>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="auth-toggle-link"
                  onClick={() => setView("signup")}
                  disabled={loading}
                >
                  Sign Up
                </button>
              </span>
            </div>
          </form>
        )}

        {view === "signup" && (
          <form className="auth-form" onSubmit={handleSignup}>
            <div className="auth-field">
              <label>Full Name</label>
              <div className="auth-input-wrapper">
                <FiUser />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured || loading}
                />
              </div>
            </div>
            <div className="auth-field">
              <label>Phone Number</label>
              <div className="auth-input-wrapper">
                <FiPhone />
                <input
                  type="tel"
                  placeholder="+91 99999 99999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isSupabaseConfigured || loading}
                />
              </div>
            </div>
            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrapper">
                <FiMail />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured || loading}
                />
              </div>
            </div>
            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrapper">
                <FiLock />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured || loading}
                  minLength={6}
                />
              </div>
            </div>
            <div className="auth-field">
              <label>Confirm Password</label>
              <div className="auth-input-wrapper">
                <FiLock />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured || loading}
                  minLength={6}
                />
              </div>
            </div>
            <button
              className="auth-submit-btn"
              type="submit"
              disabled={!isSupabaseConfigured || loading}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
            <div className="auth-footer">
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  className="auth-toggle-link"
                  onClick={() => setView("login")}
                  disabled={loading}
                >
                  Sign In
                </button>
              </span>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrapper">
                <FiMail />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!isSupabaseConfigured || loading}
                />
              </div>
            </div>
            <button
              className="auth-submit-btn"
              type="submit"
              disabled={!isSupabaseConfigured || loading}
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
            <div className="auth-footer">
              <button
                type="button"
                className="auth-toggle-link"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                onClick={() => setView("login")}
                disabled={loading}
              >
                <FiArrowLeft /> Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
