import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  BedDouble,
  CalendarCheck,
  MapPin,
  ChevronLeft,
  Phone,
} from "lucide-react";

export default function HotelBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hotel, rooms, checkIn, checkOut } = location.state || {};

  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!hotel || !rooms?.length || !checkIn || !checkOut) {
    navigate("/hotels");
    return null;
  }

  const days = Math.ceil(
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
  );
  const total = rooms.reduce((sum, r) => sum + (r.price || 0) * days, 0);

  const handleConfirm = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!contactNumber.trim()) {
      setError("Please enter a contact number.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { paymentUrl } = await api.post("/api/payment/initiate/hotel", {
        rooms: rooms.map((r) => r._id),
        hotelId: hotel._id,
        checkIn,
        checkOut,
        contactNumber: contactNumber.trim(),
      });
      // Redirect browser to SSLCommerz payment page
      window.location.href = paymentUrl;
    } catch (err) {
      setError(err.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="mx-auto max-w-2xl">
          <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">
            Confirm Your Booking
          </h1>

          {/* Hotel + Rooms Summary */}
          <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex gap-4">
              {hotel.image ? (
                <img
                  src={imgUrl(hotel.image)}
                  alt={hotel.name}
                  className="h-20 w-28 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-28 items-center justify-center rounded-xl bg-muted text-3xl">
                  🏨
                </div>
              )}
              <div className="flex-1">
                <h2 className="font-heading text-lg font-bold text-foreground">
                  {hotel.name}
                </h2>
                {hotel.area && (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {hotel.area}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {rooms.map((r) => (
                    <span
                      key={r._id}
                      className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                    >
                      <BedDouble className="h-2.5 w-2.5" /> Room {r.roomNumber}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dates Summary */}
          <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 font-heading font-semibold text-foreground">
              <CalendarCheck className="h-4 w-4 text-primary" /> Stay Details
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Check-In</p>
                <p className="font-semibold text-foreground">
                  {new Date(checkIn).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Check-Out</p>
                <p className="font-semibold text-foreground">
                  {new Date(checkOut).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-semibold text-foreground">
                  {days} night{days > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Number */}
          <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 font-heading font-semibold text-foreground">
              <Phone className="h-4 w-4 text-primary" /> Contact Details
            </h3>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="Your contact number *"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="pl-9 bg-muted"
              />
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 font-heading font-semibold text-foreground">
              Price Breakdown
            </h3>
            <div className="space-y-2 text-sm">
              {rooms.map((r) => (
                <div
                  key={r._id}
                  className="flex justify-between text-muted-foreground"
                >
                  <span>
                    Room {r.roomNumber} — ৳{(r.price || 0).toLocaleString()} ×{" "}
                    {days} night{days > 1 ? "s" : ""}
                  </span>
                  <span>৳{((r.price || 0) * days).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                <span>Total</span>
                <span className="text-xl text-primary">
                  ৳{total.toLocaleString()}
                </span>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              You will be redirected to SSLCommerz secure payment page.
            </p>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-3 text-base"
          >
            {loading
              ? "Redirecting to payment..."
              : `Pay ৳${total.toLocaleString()} via SSLCommerz`}
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
