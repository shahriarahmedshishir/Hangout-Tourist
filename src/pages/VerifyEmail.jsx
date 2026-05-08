import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { api } from "@/lib/api";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("No verification token provided");
        return;
      }

      try {
        const response = await api.post("/api/auth/verify-email", { token });
        setStatus("success");
        setMessage(response.message);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (error) {
        setStatus("error");
        setMessage(
          error.message || "Failed to verify email. The link may have expired.",
        );
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card p-8 shadow-lg text-center">
          {/* Logo & Brand */}
          <div className="mb-8 flex justify-center">
            <img src={logo} alt="Hangout Tourist" className="h-16 w-16" />
          </div>

          {/* Status Content */}
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
              <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                Verifying Email
              </h2>
              <p className="text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                Email Verified!
              </h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <p className="text-sm text-muted-foreground">
                Redirecting to login in 3 seconds...
              </p>
              <Link to="/login" className="block mt-4">
                <Button className="w-full bg-gradient-primary text-primary-foreground">
                  Go to Login
                </Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
              <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                Verification Failed
              </h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-2">
                <Link to="/login" className="block">
                  <Button className="w-full bg-gradient-primary text-primary-foreground">
                    Back to Login
                  </Button>
                </Link>
                <Link to="/login?resend=true" className="block">
                  <Button variant="outline" className="w-full">
                    Resend Email
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
