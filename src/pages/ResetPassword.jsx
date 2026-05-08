import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { api } from "@/lib/api";
import { Eye, EyeOff, Lock, Check, X, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenValid, setTokenValid] = useState(true);

  // Password validation checks
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.special &&
    password === confirmPassword;

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setTokenValid(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError("Please meet all password requirements");
      return;
    }

    const token = searchParams.get("token");
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/auth/reset-password", {
        token,
        newPassword: password,
      });
      setSuccess(response.message);
      setPassword("");
      setConfirmPassword("");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-card p-8 shadow-lg text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
              Invalid Link
            </h2>
            <p className="text-muted-foreground mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link to="/login" className="block">
              <Button className="w-full bg-gradient-primary text-primary-foreground">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Login
        </Link>

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
              Reset Password
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a new password for your account
            </p>
          </div>

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

            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
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

              {/* Password Requirements */}
              {password && (
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

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  required
                  className="bg-muted pl-10 pr-10"
                />
              </div>

              {/* Password Match Check */}
              {confirmPassword && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {password === confirmPassword ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">
                        Passwords don't match
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

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
