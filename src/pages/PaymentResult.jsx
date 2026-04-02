import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Ban } from "lucide-react";

export default function PaymentResult() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, refreshUser } = useAuth();
  const status = params.get("status"); // "success" | "fail" | "cancel"
  const tranId = params.get("tran_id");
  const reason = params.get("reason"); // "unavailable" for double-booking

  // Refresh user data on successful payment to update wallet balance
  useEffect(() => {
    if (status === "success" && tranId && user) {
      // Wait a moment for backend to process, then refresh user data
      const timer = setTimeout(() => {
        refreshUser().catch(() => {
          // Silently fail - user data will update on next navigation
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, tranId, user, refreshUser]);

  useEffect(() => {
    if (!loading && user && user.role === "hotel_staff") {
      navigate("/staff", { replace: true });
    }
  }, [user, loading, navigate]);

  const config = {
    success: {
      icon: <CheckCircle2 className="h-16 w-16 text-success" />,
      bg: "bg-success/10",
      title: "Payment Successful!",
      message:
        "Your booking is confirmed. You can view your booking details in your dashboard.",
      primaryLabel: "My Bookings",
      primaryPath: "/dashboard",
      secondaryLabel: "Go Home",
      secondaryPath: "/",
    },
    fail: {
      icon: <XCircle className="h-16 w-16 text-destructive" />,
      bg: "bg-destructive/10",
      title:
        reason === "unavailable" ? "Booking Unavailable" : "Payment Failed",
      message:
        reason === "unavailable"
          ? "Payment was processed successfully, but the room/car was booked by another user just before you. We apologize for the inconvenience. Your payment will be refunded within 24-48 hours. Please try booking another option."
          : "Your payment could not be processed. No amount has been charged. Please try again.",
      primaryLabel: reason === "unavailable" ? "Browse Hotels" : "Try Again",
      primaryPath: reason === "unavailable" ? "/hotels" : "/hotels",
      secondaryLabel: reason === "unavailable" ? "Browse Cars" : "Go Home",
      secondaryPath: reason === "unavailable" ? "/cars" : "/",
    },
    cancel: {
      icon: <Ban className="h-16 w-16 text-muted-foreground" />,
      bg: "bg-muted",
      title: "Payment Cancelled",
      message:
        "You cancelled the payment. Your booking has not been confirmed.",
      primaryLabel: "Browse Hotels",
      primaryPath: "/hotels",
      secondaryLabel: "Browse Cars",
      secondaryPath: "/cars",
    },
  };

  const c = config[status] || config.fail;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container flex min-h-[75vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated text-center animate-fade-in">
          <div className="mb-5 flex justify-center">
            <span className={`rounded-full p-4 ${c.bg}`}>{c.icon}</span>
          </div>

          <h1 className="font-heading text-2xl font-bold text-foreground">
            {c.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{c.message}</p>

          {tranId && (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground font-mono">
              Transaction ID: {tranId}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90"
              onClick={() => navigate(c.primaryPath)}
            >
              {c.primaryLabel}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(c.secondaryPath)}
            >
              {c.secondaryLabel}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
