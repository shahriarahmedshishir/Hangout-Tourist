import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BedDouble,
  CalendarCheck,
  MapPin,
  ChevronLeft,
  Phone,
  Upload,
  Coins,
} from "lucide-react";

export default function HotelBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hotel, rooms, checkIn, checkOut } = location.state || {};

  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("online");

  // Manual Payment states
  const [manualTransactionId, setManualTransactionId] = useState("");
  const [manualMethod, setManualMethod] = useState("bkash");
  const [manualScreenshot, setManualScreenshot] = useState("");

  // Hangcoin states
  const [coinBalance, setCoinBalance] = useState(0);
  const [coinLoading, setCoinLoading] = useState(false);

  // Fetch coin balance on mount
  useEffect(() => {
    if (user) {
      fetchCoinBalance();
    }
  }, [user]);

  const fetchCoinBalance = async () => {
    try {
      const response = await api.get("/api/hangcoin/balance");
      setCoinBalance(response.balance || 0);
    } catch (err) {
      console.error("Failed to fetch coin balance:", err);
    }
  };

  // Prevent staff and admin from accessing this page
  if (user && (user.role === "hotel_staff" || user.role === "admin")) {
    navigate("/");
    return null;
  }

  if (!hotel || !rooms?.length || !checkIn || !checkOut) {
    navigate("/hotels");
    return null;
  }

  const days = Math.ceil(
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
  );
  const total = rooms.reduce((sum, r) => sum + (r.price || 0) * days, 0);

  // Handle Online Payment (SSL Commerz)
  const handleOnlinePayment = async () => {
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
      // Verify rooms are still available before payment
      const availabilityCheck = await api.get(
        `/api/hotels/${hotel._id}/rooms?checkIn=${checkIn}&checkOut=${checkOut}`,
      );

      // Check if any of our selected rooms are no longer available
      const bookedRoomIds = availabilityCheck
        .filter((r) => r.isBooked || r.isAvailable === false)
        .map((r) => r._id);

      const selectedRoomIds = rooms.map((r) => r._id);
      const unavailableRooms = selectedRoomIds.filter((id) =>
        bookedRoomIds.includes(id),
      );

      if (unavailableRooms.length > 0) {
        setError(
          "One or more rooms are no longer available. Please go back and select different rooms.",
        );
        toast({
          title: "Rooms No Longer Available",
          description:
            "Someone else has booked these rooms. Please select different rooms.",
          duration: 3000,
        });
        setLoading(false);
        return;
      }

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

  // Handle Manual Payment submission
  const handleManualPayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (
      !contactNumber.trim() ||
      !manualTransactionId.trim() ||
      !manualScreenshot
    ) {
      setError("Please fill all fields and upload screenshot.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // First, initiate a pending booking
      const bookingRes = await api.post("/api/manual-payment/initiate/hotel", {
        rooms: rooms.map((r) => r._id),
        hotelId: hotel._id,
        checkIn,
        checkOut,
        contactNumber: contactNumber.trim(),
      });

      // Then submit manual payment
      await api.post("/api/manual-payment/submit", {
        bookingId: bookingRes.bookingId,
        paymentMethod: manualMethod,
        transactionId: manualTransactionId,
        screenshot: manualScreenshot,
      });

      toast({
        title: "Payment Submitted",
        description:
          "Your manual payment has been submitted for verification. Please check your dashboard.",
        duration: 3000,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Payment submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Hangcoin Payment
  const handleCoinPayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!contactNumber.trim()) {
      setError("Please enter a contact number.");
      return;
    }
    if (coinBalance < total) {
      toast({
        title: "Not Enough Coins",
        description: `You need ৳${(total - coinBalance).toLocaleString()} more coins. Please top up.`,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setCoinLoading(true);
    setError("");
    try {
      // Verify rooms are still available
      const availabilityCheck = await api.get(
        `/api/hotels/${hotel._id}/rooms?checkIn=${checkIn}&checkOut=${checkOut}`,
      );

      const bookedRoomIds = availabilityCheck
        .filter((r) => r.isBooked || r.isAvailable === false)
        .map((r) => r._id);

      const selectedRoomIds = rooms.map((r) => r._id);
      const unavailableRooms = selectedRoomIds.filter((id) =>
        bookedRoomIds.includes(id),
      );

      if (unavailableRooms.length > 0) {
        setError(
          "One or more rooms are no longer available. Please select different rooms.",
        );
        setCoinLoading(false);
        return;
      }

      // Initiate coin payment booking
      const bookingRes = await api.post(
        "/api/hangcoin/initiate-booking/hotel",
        {
          rooms: rooms.map((r) => r._id),
          hotelId: hotel._id,
          checkIn,
          checkOut,
          contactNumber: contactNumber.trim(),
        },
      );

      // Pay with coins
      await api.post(`/api/hangcoin/pay-booking/${bookingRes.bookingId}`);

      toast({
        title: "Payment Successful",
        description: `Booking confirmed! ৳${total.toLocaleString()} coins deducted.`,
        duration: 3000,
      });

      navigate("/dashboard");
    } catch (err) {
      if (err.message && err.message.includes("Not enough coins")) {
        toast({
          title: "Not Enough Coins",
          description: "Please top up your hangcoin balance.",
          variant: "destructive",
          duration: 3000,
        });
      } else {
        setError(err.message || "Payment failed. Please try again.");
      }
    } finally {
      setCoinLoading(false);
    }
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setManualScreenshot(event.target?.result);
      };
      reader.readAsDataURL(file);
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
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Payment Methods Tabs */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="online">Online Payment</TabsTrigger>
                <TabsTrigger value="manual">Manual Payment</TabsTrigger>
                <TabsTrigger value="coin">Hangcoin</TabsTrigger>
              </TabsList>

              {/* Online Payment Tab */}
              <TabsContent value="online" className="space-y-4">
                <div className="mb-4 text-sm text-muted-foreground">
                  <p className="mb-2">Pay securely using SSLCommerz gateway</p>
                  <p className="rounded-lg bg-muted p-2 text-xs">
                    You will be redirected to SSLCommerz secure payment page.
                  </p>
                </div>
                <Button
                  onClick={handleOnlinePayment}
                  disabled={loading}
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-3 text-base"
                >
                  {loading
                    ? "Redirecting to payment..."
                    : `Pay ৳${total.toLocaleString()} via SSLCommerz`}
                </Button>
              </TabsContent>

              {/* Manual Payment Tab */}
              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={manualMethod}
                      onChange={(e) => setManualMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="bkash">Bkash</option>
                      <option value="nagad">Nagad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Transaction ID *
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your transaction ID"
                      value={manualTransactionId}
                      onChange={(e) => setManualTransactionId(e.target.value)}
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Screenshot of Payment Proof *
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-primary cursor-pointer hover:bg-muted transition-colors">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">
                          {manualScreenshot ? "Change Image" : "Upload Image"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotUpload}
                          className="hidden"
                        />
                      </label>
                      {manualScreenshot && (
                        <span className="text-xs text-green-600">
                          ✓ Image uploaded
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">
                      How to submit manual payment:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Make payment via Bkash or Nagad</li>
                      <li>Note the transaction ID</li>
                      <li>Upload screenshot of payment confirmation</li>
                      <li>Wait for admin approval (check dashboard)</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleManualPayment}
                    disabled={loading}
                    className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-3 text-base"
                  >
                    {loading
                      ? "Submitting..."
                      : "Submit Payment for Verification"}
                  </Button>
                </div>
              </TabsContent>

              {/* Hangcoin Payment Tab */}
              <TabsContent value="coin" className="space-y-4">
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      Your Hangcoin Balance:
                    </span>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="font-bold text-lg text-primary">
                        {coinBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    1 Hangcoin = ৳1 | You need ৳{total.toLocaleString()}
                  </p>
                </div>

                {coinBalance >= total ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                      <p className="text-sm text-green-800">
                        ✓ You have enough coins to complete this booking
                      </p>
                    </div>
                    <Button
                      onClick={handleCoinPayment}
                      disabled={coinLoading}
                      className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-3 text-base"
                    >
                      {coinLoading
                        ? "Processing..."
                        : `Pay ৳${total.toLocaleString()} with Hangcoin`}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                      <p className="text-sm text-yellow-800 font-medium">
                        Not enough coins
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        You need ৳{(total - coinBalance).toLocaleString()} more
                        coins
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate("/profile?tab=topup")}
                      className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-2 text-sm"
                    >
                      Top Up Coins
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
