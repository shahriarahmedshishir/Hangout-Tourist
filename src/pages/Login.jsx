import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Password validation checks
  const passwordChecks = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password),
  };

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.special;

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.id]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
      const body = isSignUp
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const data = await api.post(endpoint, body);
      if (isSignUp) {
        setSuccess(
          "Account created! Please check your email to verify your account.",
        );
        setForm({ name: "", email: "", password: "" });
        // Don't switch to sign in - keep showing the message
      } else {
        login(data.token, data.user);
        // If a redirect was provided (e.g. booking flow), honor it and pass state
        const redirectTo = location?.state?.redirectTo;
        const redirectPkg = location?.state?.pkg;
        if (redirectTo) {
          if (redirectPkg)
            navigate(redirectTo, { state: { pkg: redirectPkg } });
          else navigate(redirectTo);
          return;
        }
        if (data.user.role === "admin") navigate("/admin");
        else if (data.user.role === "hotel_staff") navigate("/staff");
        else navigate("/");
      }
    } catch (err) {
      // Check if error is about email verification
      if (
        err.response?.status === 403 &&
        err.response?.data?.requiresVerification
      ) {
        setError(`${err.message} You can resend the verification email below.`);
        setShowResendEmail(true);
        setResendEmail(form.email);
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!resendEmail) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/resend-verification", { email: resendEmail });
      setSuccess("Verification email sent! Please check your inbox.");
      setShowResendEmail(false);
    } catch (err) {
      setError(err.message || "Failed to resend email");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/forgot-password", {
        email: forgotPasswordEmail,
      });
      setSuccess(
        "If an account exists with this email, a reset link has been sent. Please check your inbox.",
      );
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        {/* Card Container */}
        <div className="rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
          {/* Logo & Brand */}
          <div className="mb-6 flex items-center gap-2">
            <img src={logo} alt="Hangout Tourist" className="h-10 w-10" />
            <span className="font-heading text-2xl font-bold text-foreground">
              Hangout <span className="text-gradient-primary">Tourist</span>
            </span>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignUp
                ? "Sign up to start your journey"
                : "Sign in to access your bookings"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">
                {success}
              </p>
            )}

            {isSignUp && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="bg-muted pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="bg-muted pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="bg-muted pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password Requirements Checklist - Show only during signup */}
              {isSignUp && form.password && (
                <div className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-foreground">
                    Password Requirements:
                  </p>
                  <div className="space-y-1">
                    <PasswordCheck
                      valid={passwordChecks.length}
                      label="At least 8 characters"
                    />
                    <PasswordCheck
                      valid={passwordChecks.uppercase}
                      label="One uppercase letter (A-Z)"
                    />
                    <PasswordCheck
                      valid={passwordChecks.lowercase}
                      label="One lowercase letter (a-z)"
                    />
                    <PasswordCheck
                      valid={passwordChecks.special}
                      label="One special character (!@#$%^&*)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resend Verification Email Section - Show when email verification is needed */}
            {!isSignUp && showResendEmail && (
              <div className="rounded-lg bg-warning/10 p-3 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Verify your email to continue
                </p>
                <div>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={loading}
                  className="w-full text-sm"
                  variant="outline"
                >
                  Resend Verification Email
                </Button>
              </div>
            )}

            {/* Forgot Password Form - Show when clicked */}
            {!isSignUp && showForgotPassword && (
              <div className="rounded-lg bg-info/10 p-3 space-y-3 border border-info/20">
                <p className="text-sm font-medium text-foreground">
                  Reset Your Password
                </p>
                <div>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={forgotPasswordEmail}
                    onChange={(e) => {
                      setForgotPasswordEmail(e.target.value);
                      setError("");
                    }}
                    className="bg-background"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading || !forgotPasswordEmail}
                    className="flex-1 bg-gradient-primary text-primary-foreground text-sm"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail("");
                      setError("");
                    }}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-primary" /> Remember
                  me
                </label>
                {!showForgotPassword && (
                  <Button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    disabled={loading}
                    variant="ghost"
                    className="h-auto px-2 py-1 text-sm text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    Forgot Password?
                  </Button>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (isSignUp && !isPasswordValid)}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {loading
                ? "Please wait..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setSuccess("");
                setShowResendEmail(false);
                setShowForgotPassword(false);
                setForgotPasswordEmail("");
              }}
              className="text-primary hover:underline font-medium transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a href="#" className="text-primary hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-primary hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

// Helper component for password checks
const PasswordCheck = ({ valid, label }) => (
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    {valid ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : (
      <X className="h-4 w-4 text-red-600" />
    )}
    <span className={valid ? "text-green-600" : "text-red-600"}>{label}</span>
  </div>
);

export default Login;
