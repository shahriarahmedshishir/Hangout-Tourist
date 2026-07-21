import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  BusFront,
  MapPin,
  Calendar,
  Phone,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
} from "lucide-react";
import AppBreadcrumb from "../components/common/AppBreadcrumb";

const BusBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { bus } = location.state || {};

  const [travelDate, setTravelDate] = useState("");
  const [seats, setSeats] = useState("1");
  const [pickupLocation, setPickupLocation] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeImg, setActiveImg] = useState(0);

  // No payment states needed - instructions only

  // Prevent staff and admin from accessing this page
  if (user && (user.role === "hotel_staff" || user.role === "admin")) {
    navigate("/");
    return null;
  }

  if (!bus) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No bus selected.</p>
            <Button asChild>
              <Link to="/cars">Browse Buses</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Validation function
  const validateBusBooking = () => {
    if (!travelDate) {
      setError("Please select a travel date.");
      return false;
    }
    if (!seats || parseInt(seats, 10) <= 0) {
      setError("Please enter number of seats (at least 1).");
      return false;
    }
    if (!contactNumber.trim()) {
      setError("Please enter contact number.");
      return false;
    }
    setError("");
    return true;
  };

  const pricePerSeat = bus.price || 0;
  const total = pricePerSeat * parseInt(seats || 0);

  // Handle Apply Button - Submit ticket request
  const handleApplyBooking = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!validateBusBooking()) {
      return;
    }

    setLoading(true);
    try {
      // Submit bus booking request for admin verification
      await api.post("/api/manual-payment/request/bus", {
        busId: bus._id,
        travelDate,
        seats: parseInt(seats),
        pickupLocation: pickupLocation.trim(),
        contactNumber: contactNumber.trim(),
        totalAmount: total,
      });

      toast({
        title: "Ticket Request Submitted",
        description:
          "Your bus ticket request has been submitted. Admin will confirm if ticket is available.",
        duration: 3000,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message || "Application submission failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 container py-8">
       <AppBreadcrumb/>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Bus Details */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              {/* Images Carousel */}
              {bus.images && bus.images.length > 0 && (
                <div className="mb-6">
                  <div className="relative mb-3 overflow-hidden rounded-xl bg-muted">
                    <img
                      src={imgUrl(bus.images[activeImg])}
                      alt="Bus"
                      className="h-80 w-full object-cover"
                    />
                  </div>
                  {bus.images.length > 1 && (
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() =>
                          setActiveImg(
                            (p) =>
                              (p - 1 + bus.images.length) % bus.images.length,
                          )
                        }
                        className="rounded-lg p-2 hover:bg-muted"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="flex gap-2">
                        {bus.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImg(idx)}
                            className={`h-2 rounded-full transition-all ${
                              activeImg === idx
                                ? "w-6 bg-primary"
                                : "w-2 bg-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          setActiveImg((p) => (p + 1) % bus.images.length)
                        }
                        className="rounded-lg p-2 hover:bg-muted"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bus Info */}
              <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
                {bus.name}
              </h1>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{bus.seats} Seats</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Departs: {bus.departureTime}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BusFront className="h-4 w-4" />
                  <span>{bus.acType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {bus.tripType === "round-trip"
                      ? "🔄 Round-Trip"
                      : "➜ One-Way"}
                  </span>
                </div>
                <div className="font-medium text-foreground">
                  ৳{bus.price}/Seat
                </div>
              </div>

              {/* Routes */}
              <div>
                <h3 className="mb-2 font-semibold text-foreground">Routes</h3>
                <div className="space-y-1">
                  {bus.routes?.map((route, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <MapPin className="h-4 w-4" />
                      {route}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card h-fit">
            <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
              Book Your Seats
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Travel Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="bg-muted"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Number of Seats <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  className="bg-muted"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Pickup Location <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g., Dhaka Station"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="bg-muted"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Contact Number <span className="text-destructive">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="Your phone number"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="bg-muted"
                  required
                />
              </div>
            </div>

            {/* Price Summary */}
            <div className="mb-6 rounded-lg bg-muted p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Price per Seat:</span>
                <span className="font-medium">
                  ৳{pricePerSeat.toLocaleString()}
                </span>
              </div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Number of Seats:</span>
                <span className="font-medium">{seats}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-semibold text-foreground">Total:</span>
                <span className="font-bold text-lg text-primary">
                  ৳{total.toLocaleString()}
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Booking Instructions and Application */}
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <h3 className="font-semibold text-blue-900 mb-3">
                  How to Book Your Ticket
                </h3>
                <p className="text-sm text-blue-800 mb-4">
                  Call the following number to confirm your ticket booking:
                </p>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border border-pink-200 bg-pink-50 p-4">
                    <p className="font-medium text-pink-700">bKash</p>
                    <p className="mt-1 text-lg font-bold text-pink-900">
                      01743-917153
                    </p>
                  </div>

                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <p className="font-medium text-orange-700">Nagad</p>
                    <p className="mt-1 text-lg font-bold text-orange-900">
                      01743-917153
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-800 mt-4">
                  Let the admin know your booking details when you call. They
                  will confirm if the ticket is available.
                </p>
              </div>

              <Button
                onClick={handleApplyBooking}
                disabled={loading}
                className="w-full bg-gradient-primary text-primary-foreground py-6 text-base"
              >
                {loading ? "Submitting..." : "Apply for Bus Ticket"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                After clicking Apply, call the number above. Admin will confirm
                your booking once you complete the call.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BusBooking;
