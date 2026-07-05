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

  const handleOAuthLogin = async (provider) => {
    if (!isSupabaseConfigured) {
      onDemoMode();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || `Failed to sign in with ${provider}`);
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

            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <div className="auth-oauth-row">
              <button
                type="button"
                className="oauth-btn google-btn"
                onClick={() => handleOAuthLogin("google")}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </div>

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

            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <div className="auth-oauth-row">
              <button
                type="button"
                className="oauth-btn google-btn"
                onClick={() => handleOAuthLogin("google")}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </div>

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
