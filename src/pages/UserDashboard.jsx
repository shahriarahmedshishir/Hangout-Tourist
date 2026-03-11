import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Hotel,
  Car,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

const statusBadge = (booking) => {
  if (booking.status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3 w-3" /> Confirmed
      </span>
    );
  }
  if (booking.status === "cancelled") {
    if (booking.refundStatus === "completed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <CheckCircle2 className="h-3 w-3" /> Refunded
        </span>
      );
    }
    if (booking.refundStatus === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">
          <RefreshCw className="h-3 w-3 animate-spin" /> Refund in Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
        <XCircle className="h-3 w-3" /> Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {booking.status}
    </span>
  );
};

const BookingCard = ({ booking }) => {
  const isHotel = booking.type === "hotel";
  const dateStart = isHotel ? booking.checkIn : booking.pickupDate;
  const dateEnd = isHotel ? booking.checkOut : booking.returnDate;
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-xl p-2.5 ${isHotel ? "bg-primary/10" : "bg-secondary/10"}`}
          >
            {isHotel ? (
              <Hotel className="h-5 w-5 text-primary" />
            ) : (
              <Car className="h-5 w-5 text-secondary" />
            )}
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">
              {isHotel
                ? booking.hotelName || "Hotel Booking"
                : booking.carName || "Car Rental"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isHotel
                ? `Room ${booking.roomNumber || ""}`
                : booking.carType || ""}
            </p>
          </div>
        </div>
        {statusBadge(booking)}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">
            {isHotel ? "Check-in" : "Pick-up"}
          </p>
          <p className="font-medium text-foreground">{fmt(dateStart)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {isHotel ? "Check-out" : "Return"}
          </p>
          <p className="font-medium text-foreground">{fmt(dateEnd)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="font-medium text-foreground">
            {booking.days} day{booking.days !== 1 ? "s" : ""}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-heading font-bold text-primary">
            ৳{(booking.totalAmount || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {booking.status === "cancelled" &&
        booking.refundStatus === "completed" && (
          <div className="mt-4 rounded-xl bg-primary/5 p-3 text-sm">
            <p className="font-medium text-primary mb-1">Refund Processed</p>
            <p className="text-muted-foreground">
              Method:{" "}
              <span className="text-foreground">{booking.paymentMethod}</span>
            </p>
            <p className="text-muted-foreground">
              Transaction ID:{" "}
              <span className="font-mono text-foreground">
                {booking.transactionId}
              </span>
            </p>
            {booking.refundScreenshot && (
              <a
                href={imgUrl(booking.refundScreenshot)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs text-primary underline"
              >
                View screenshot
              </a>
            )}
          </div>
        )}

      {booking.status === "cancelled" &&
        booking.refundStatus === "in_progress" && (
          <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-700">
            <Clock className="inline h-4 w-4 mr-1" />
            Your refund is being processed. We'll notify you once completed.
          </div>
        )}
    </div>
  );
};

const UserDashboard = () => {
  const { user, socket, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("hotel");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    api
      .get("/api/bookings/my")
      .then((data) => setBookings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleCancelled = ({ bookingId }) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, status: "cancelled", refundStatus: "in_progress" }
            : b,
        ),
      );
    };

    const handleRefunded = ({
      bookingId,
      transactionId,
      paymentMethod,
      refundScreenshot,
    }) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? {
                ...b,
                status: "cancelled",
                refundStatus: "completed",
                transactionId,
                paymentMethod,
                refundScreenshot,
              }
            : b,
        ),
      );
    };

    socket.on("booking-cancelled", handleCancelled);
    socket.on("booking-refunded", handleRefunded);
    return () => {
      socket.off("booking-cancelled", handleCancelled);
      socket.off("booking-refunded", handleRefunded);
    };
  }, [socket]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center text-muted-foreground">
          Loading...
        </div>
        <Footer />
      </div>
    );
  }

  const hotelBookings = bookings.filter((b) => b.type === "hotel");
  const carBookings = bookings.filter((b) => b.type === "car");
  const shown = tab === "hotel" ? hotelBookings : carBookings;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-primary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-primary-foreground">
            My Dashboard
          </h1>
          <p className="text-primary-foreground/80">
            Welcome back, {user?.name || "Traveler"}
          </p>
        </div>
      </div>

      <div className="container py-10">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: "Hotel Bookings",
              value: hotelBookings.length,
              icon: <Hotel className="h-5 w-5" />,
              color: "text-primary",
            },
            {
              label: "Car Rentals",
              value: carBookings.length,
              icon: <Car className="h-5 w-5" />,
              color: "text-secondary",
            },
            {
              label: "Confirmed",
              value: bookings.filter((b) => b.status === "confirmed").length,
              icon: <CheckCircle2 className="h-5 w-5" />,
              color: "text-success",
            },
            {
              label: "Cancelled",
              value: bookings.filter((b) => b.status === "cancelled").length,
              icon: <XCircle className="h-5 w-5" />,
              color: "text-destructive",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className={`mb-2 ${s.color}`}>{s.icon}</div>
              <div className="font-heading text-2xl font-bold text-foreground">
                {s.value}
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={tab === "hotel" ? "default" : "outline"}
            onClick={() => setTab("hotel")}
            className={
              tab === "hotel"
                ? "bg-gradient-primary text-primary-foreground"
                : ""
            }
          >
            <Hotel className="h-4 w-4 mr-2" /> Hotel Bookings (
            {hotelBookings.length})
          </Button>
          <Button
            variant={tab === "car" ? "default" : "outline"}
            onClick={() => setTab("car")}
            className={
              tab === "car" ? "bg-gradient-primary text-primary-foreground" : ""
            }
          >
            <Car className="h-4 w-4 mr-2" /> Car Rentals ({carBookings.length})
          </Button>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-20 text-center shadow-card">
            <p className="text-muted-foreground mb-4">
              No {tab === "hotel" ? "hotel bookings" : "car rentals"} yet.
            </p>
            <Button
              asChild
              className="bg-gradient-primary text-primary-foreground"
            >
              <Link to={tab === "hotel" ? "/hotels" : "/cars"}>
                {tab === "hotel" ? "Browse Hotels" : "Browse Cars"}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((b) => (
              <BookingCard key={b._id} booking={b} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default UserDashboard;
