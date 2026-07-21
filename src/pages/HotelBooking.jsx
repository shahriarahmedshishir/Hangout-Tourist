import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet";
import {
  BedDouble,
  CalendarCheck,
  MapPin,
  ChevronLeft,
  Phone,
  Upload,
  Coins,
  User,
  Mail,
  MapPinIcon,
  FileText,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function HotelBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hotel, rooms, checkIn, checkOut } = location.state || {};

  // Guest Details States
  const [guestDetails, setGuestDetails] = useState({
    fullName: "",
    email: "",
    address: "",
    contactNumber: "",
    nidNumber: "",
  });

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

  // Terms & Policy states
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);

  // Fetch coin balance on mount
  useEffect(() => {
    if (user) {
      fetchCoinBalance();
      // Pre-fill user details if available
      if (user.email) {
        setGuestDetails((prev) => ({
          ...prev,
          email: user.email,
          fullName: user.name || "",
        }));
      }
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

  // Validate guest details
  const validateGuestDetails = () => {
    if (
      !guestDetails.fullName.trim() ||
      !guestDetails.email.trim() ||
      !guestDetails.address.trim() ||
      !guestDetails.contactNumber.trim() ||
      !guestDetails.nidNumber.trim()
    ) {
      setError("Please fill all guest details including NID number.");
      return false;
    }
    if (!termsAccepted || !policyAccepted) {
      setError("Please accept terms and policy to proceed.");
      return false;
    }
    return true;
  };

  // Handle Online Payment (SSL Commerz)
  const handleOnlinePayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!validateGuestDetails()) {
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
        guestDetails,
        occupancy: { adult: 1, child: 0 },
        totalAmount: total,
      });
      // Validate gateway response
      if (!paymentUrl) {
        throw new Error("Payment gateway did not return a redirect URL");
      }

      // Redirect browser to SSLCommerz payment page
      window.location.href = paymentUrl;
    } catch (err) {
      console.error("Hotel payment initiation error:", err);
      const msg = err.message || "Booking failed. Please try again.";
      setError(msg);
      toast({
        title: "Payment Error",
        description: msg,
        duration: 4000,
        variant: "destructive",
      });
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
    if (!validateGuestDetails()) {
      return;
    }
    if (!manualTransactionId.trim() || !manualScreenshot) {
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
        guestDetails,
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
    if (!validateGuestDetails()) {
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
          guestDetails,
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

  const handleGuestDetailsChange = (field, value) => {
    setGuestDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");
  };

  return (
    <div className="min-h-screen bg-background">
            <Helmet>
        <meta charSet="utf-8" />
        <title>Hang Out Tourist - Hotel Booking</title>
      </Helmet>
      <Navbar />
      <div className="container py-8 px-4 md:px-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="mx-auto max-w-7xl">
          <h1 className="mb-2 font-heading text-3xl md:text-4xl font-bold text-foreground">
            Confirm Your Booking
          </h1>
          <p className="mb-8 text-muted-foreground">
            Review your reservation details and complete your booking
          </p>

          {error && (
            <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Hotel & Booking Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hotel Summary */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
                  Hotel Details
                </h2>
                <div className="flex gap-4">
                  {hotel.image ? (
                    <img
                      src={imgUrl(hotel.image)}
                      alt={hotel.name}
                      className="h-24 w-32 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-24 w-32 items-center justify-center rounded-xl bg-muted text-4xl flex-shrink-0">
                      🏨
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {hotel.name}
                    </h3>
                    {hotel.area && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" /> {hotel.area}
                      </p>
                    )}
                    {hotel.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {hotel.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rooms.map((r) => (
                        <span
                          key={r._id}
                          className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground font-medium"
                        >
                          <BedDouble className="h-3 w-3" /> Room {r.roomNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stay Details */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-foreground">
                  <CalendarCheck className="h-5 w-5 text-primary" /> Stay
                  Details
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Check-In
                    </p>
                    <p className="mt-2 font-bold text-foreground text-lg">
                      {new Date(checkIn).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Check-Out
                    </p>
                    <p className="mt-2 font-bold text-foreground text-lg">
                      {new Date(checkOut).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      Duration
                    </p>
                    <p className="mt-2 font-bold text-foreground text-lg">
                      {days} {days === 1 ? "Night" : "Nights"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Guest Details Form */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-foreground">
                  <User className="h-5 w-5 text-primary" /> Guest Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Your full name"
                        value={guestDetails.fullName}
                        onChange={(e) =>
                          handleGuestDetailsChange("fullName", e.target.value)
                        }
                        className="pl-9 bg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        value={guestDetails.email}
                        onChange={(e) =>
                          handleGuestDetailsChange("email", e.target.value)
                        }
                        className="pl-9 bg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Contact Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="+880 1234567890"
                        value={guestDetails.contactNumber}
                        onChange={(e) =>
                          handleGuestDetailsChange(
                            "contactNumber",
                            e.target.value.trim(),
                          )
                        }
                        required
                        className="pl-9 bg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Address *
                    </label>
                    <div className="relative">
                      <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Street address, city, zip"
                        value={guestDetails.address}
                        onChange={(e) =>
                          handleGuestDetailsChange("address", e.target.value)
                        }
                        className="pl-9 bg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      NID Number *
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your National ID number"
                      value={guestDetails.nidNumber}
                      onChange={(e) =>
                        handleGuestDetailsChange("nidNumber", e.target.value)
                      }
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
                  Price Breakdown
                </h2>
                <div className="space-y-3">
                  {rooms.map((r) => (
                    <div
                      key={r._id}
                      className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm text-muted-foreground">
                        Room {r.roomNumber} — ৳{(r.price || 0).toLocaleString()}{" "}
                        × {days} {days === 1 ? "night" : "nights"}
                      </span>
                      <span className="font-semibold text-foreground">
                        ৳{((r.price || 0) * days).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-bold text-foreground text-lg">
                      Total Amount
                    </span>
                    <span className="text-3xl font-bold text-primary">
                      ৳{total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Terms & Policies */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card sticky top-8">
                <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-foreground">
                  <FileText className="h-5 w-5 text-primary" /> Terms & Policies
                </h2>

                {/* Terms Checkbox */}
                <div className="mb-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={setTermsAccepted}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium text-foreground cursor-pointer"
                      >
                        I accept the{" "}
                        <button
                          onClick={() => setShowTermsDialog(true)}
                          className="text-primary hover:underline font-semibold"
                        >
                          Hotel Booking Terms
                        </button>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Please review our terms of service
                      </p>
                    </div>
                  </div>
                </div>

                {/* Policy Checkbox */}
                <div className="mb-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="policy"
                      checked={policyAccepted}
                      onCheckedChange={setPolicyAccepted}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="policy"
                        className="text-sm font-medium text-foreground cursor-pointer"
                      >
                        I agree to the{" "}
                        <button
                          onClick={() => setShowPolicyDialog(true)}
                          className="text-primary hover:underline font-semibold"
                        >
                          Privacy & Cancellation Policy
                        </button>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your data is safe with us
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acceptance Status */}
                {termsAccepted && policyAccepted ? (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 mb-4 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <p className="text-xs text-green-800 font-medium">
                      All terms accepted
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 mb-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <p className="text-xs text-yellow-800 font-medium">
                      Please accept all terms
                    </p>
                  </div>
                )}

                {/* Booking Summary Card */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                    Booking Summary
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    ৳{total.toLocaleString()}
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1 pt-2">
                    <p>• {rooms.length} room(s)</p>
                    <p>• {days} night(s)</p>
                    <p>• Guest: {guestDetails.fullName || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">
              Choose Payment Method
            </h2>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-6 h-auto">
                <TabsTrigger value="online" className="py-3">
                  💳 Online Payment
                </TabsTrigger>
                <TabsTrigger value="manual" className="py-3">
                  📱 Manual Payment
                </TabsTrigger>
                <TabsTrigger value="coin" className="py-3">
                  🪙 Hangcoin
                </TabsTrigger>
              </TabsList>

              {/* Online Payment Tab */}
              <TabsContent value="online" className="space-y-4 mt-6">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Secure Online Payment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pay securely using SSLCommerz gateway. You will be
                    redirected to a secure payment page.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Payment Gateway
                    </p>
                    <p className="font-semibold text-foreground">SSLCommerz</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Total Amount
                    </p>
                    <p className="font-bold text-xl text-primary">
                      ৳{total.toLocaleString()}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleOnlinePayment}
                  disabled={loading || !termsAccepted || !policyAccepted}
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-6 text-lg font-semibold rounded-xl"
                >
                  {loading
                    ? "Redirecting to payment..."
                    : `Pay ৳${total.toLocaleString()} via SSLCommerz`}
                </Button>
              </TabsContent>

{/* Manual Payment Tab */}
<TabsContent value="manual" className="mt-6 space-y-6">
  {/* Header */}
  <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 to-primary/10 p-5">
    <h3 className="text-base font-semibold text-foreground">
      Manual Payment
    </h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Complete your payment via <span className="font-medium">bKash</span> or{" "}
      <span className="font-medium">Nagad</span>, then submit your transaction
      details for verification.
    </p>
  </div>

  <div className="grid gap-5 lg:grid-cols-2">
    {/* Left Side */}
    <div className="space-y-5">
      {/* Payment Method */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Payment Method *
        </label>

        <select
          value={manualMethod}
          onChange={(e) => setManualMethod(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="bkash"> bKash</option>
          <option value="nagad"> Nagad</option>
        </select>
      </div>

      {/* Payment Number */}
      <div
        className={`rounded-2xl border p-5 transition-all duration-300 ${
          manualMethod === "bkash"
            ? "border-pink-200 bg-pink-50"
            : "border-orange-200 bg-orange-50"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className={`text-sm font-semibold ${
                manualMethod === "bkash"
                  ? "text-pink-700"
                  : "text-orange-700"
              }`}
            >
              {manualMethod === "bkash"
                ? "bKash Personal Number"
                : "Nagad Personal Number"}
            </p>

            <h3 className="mt-2 text-2xl font-bold tracking-wide text-slate-900">
              01743-917153
            </h3>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Send the payment to this number and use the received
              transaction ID below.
            </p>
          </div>

          <div
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${
              manualMethod === "bkash"
                ? "bg-pink-100 text-pink-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {manualMethod === "bkash" ? "bKash" : "Nagad"}
          </div>
        </div>
      </div>

      {/* Transaction ID */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Transaction ID *
        </label>

        <Input
          type="text"
          placeholder="Enter your transaction ID"
          value={manualTransactionId}
          onChange={(e) => setManualTransactionId(e.target.value)}
          className="h-12 rounded-xl"
        />
      </div>
    </div>

    {/* Right Side */}
    <div className="space-y-5">
      {/* Upload */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <label className="mb-3 block text-sm font-semibold text-foreground">
          Payment Proof *
        </label>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/25 bg-primary/5 px-6 py-10 transition hover:border-primary hover:bg-primary/10">
          <Upload className="mb-3 h-10 w-10 text-primary" />

          <h4 className="font-semibold text-foreground">
            {manualScreenshot ? "Screenshot Uploaded" : "Upload Screenshot"}
          </h4>

          <p className="mt-1 text-center text-xs text-muted-foreground">
            PNG, JPG or JPEG (Maximum 5MB)
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={handleScreenshotUpload}
            className="hidden"
          />
        </label>

        {manualScreenshot && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <Check className="h-4 w-4" />
            Screenshot uploaded successfully.
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-2xl border bg-slate-50 p-5">
        <h4 className="mb-4 font-semibold text-slate-900">
          Payment Instructions
        </h4>

        <ol className="space-y-3 text-sm text-slate-600">
          <li>1. Send payment via bKash or Nagad.</li>
          <li>2. Save your Transaction ID.</li>
          <li>3. Capture the payment confirmation.</li>
          <li>4. Upload the screenshot above.</li>
          <li>5. Submit and wait for verification.</li>
        </ol>
      </div>
    </div>
  </div>

  {/* Submit */}
  <Button
    onClick={handleManualPayment}
    disabled={loading || !termsAccepted || !policyAccepted}
    className="h-14 w-full rounded-2xl bg-gradient-primary text-base font-semibold text-primary-foreground transition hover:opacity-90"
  >
    {loading
      ? "Submitting..."
      : "Submit Payment for Verification"}
  </Button>
</TabsContent>

              {/* Hangcoin Payment Tab */}
              <TabsContent value="coin" className="space-y-4 mt-6">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                        Your Balance
                      </p>
                      <p className="font-bold text-2xl text-primary">
                        {coinBalance.toLocaleString()}
                      </p>
                    </div>
                    <Coins className="h-12 w-12 text-primary opacity-20" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    1 Hangcoin = ৳1 | Cost: ৳{total.toLocaleString()}
                  </p>
                </div>

                {coinBalance >= total ? (
                  <>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-900">
                          Sufficient Balance
                        </p>
                        <p className="text-xs text-green-800 mt-1">
                          You have enough Hangcoin to complete this booking
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border p-4 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Cost
                        </p>
                        <p className="font-bold text-xl text-foreground">
                          ৳{total.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-4 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          After Payment
                        </p>
                        <p className="font-bold text-xl text-foreground">
                          {(coinBalance - total).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleCoinPayment}
                      disabled={
                        coinLoading || !termsAccepted || !policyAccepted
                      }
                      className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-6 text-lg font-semibold rounded-xl"
                    >
                      {coinLoading
                        ? "Processing..."
                        : `Pay ৳${total.toLocaleString()} with Hangcoin`}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">
                          Insufficient Balance
                        </p>
                        <p className="text-xs text-amber-800 mt-1">
                          You need ৳{(total - coinBalance).toLocaleString()}{" "}
                          more coins
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border p-4 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Required
                        </p>
                        <p className="font-bold text-xl text-foreground">
                          ৳{total.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-4 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Shortfall
                        </p>
                        <p className="font-bold text-xl text-destructive">
                          ৳{(total - coinBalance).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate("/profile?tab=topup")}
                      className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-6 text-lg font-semibold rounded-xl"
                    >
                      Top Up Coins
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Terms Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Hotel Booking Terms & Conditions
            </DialogTitle>
            <DialogDescription>
              Please read these terms carefully before booking
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-6 text-sm leading-7 text-muted-foreground">
              <p>
                Welcome to{" "}
                <strong className="text-foreground">Hang Out Tourist</strong>.
                By making a hotel reservation through our platform, you
                acknowledge that you have read, understood, and agree to be
                bound by the following Terms & Conditions.
              </p>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  1. Booking Information
                </h3>
                <p>
                  All reservations are made based on the information provided by
                  the guest. The guest is solely responsible for ensuring that
                  all booking details are accurate, complete, and up to date.
                  Hang Out Tourist shall not be liable for any loss,
                  inconvenience, or additional costs arising from incorrect or
                  incomplete information submitted during the booking process.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">2. Payment</h3>
                <p>
                  A booking shall be considered confirmed only after the
                  required advance payment or full payment, as specified at the
                  time of reservation, has been successfully received. Failure
                  to complete the required payment within the stipulated
                  timeframe may result in automatic cancellation of the
                  reservation.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  3. Check-In and Check-Out
                </h3>
                <p>
                  Check-in and check-out times are determined exclusively by the
                  policies of the respective hotel. Guests are responsible for
                  complying with the hotel's operational procedures and timing
                  requirements.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  4. Booking Modifications and Cancellations
                </h3>
                <p>
                  Any request to modify or cancel a reservation shall be subject
                  to the cancellation and amendment policy of the respective
                  hotel. Applicable cancellation fees, amendment charges, or
                  non-refundable conditions may apply in accordance with the
                  hotel's terms.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  5. No-Show Policy
                </h3>
                <p>
                  If a guest fails to check in on the scheduled arrival date
                  without prior notice ("No-Show"), the reservation may be
                  treated as non-refundable unless otherwise stated in the
                  hotel's cancellation policy.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  6. Identification Requirements
                </h3>
                <p>
                  Guests must present a valid government-issued photo
                  identification, including but not limited to a National ID
                  Card (NID), Passport, or Driving License, at the time of
                  check-in. The hotel reserves the right to request additional
                  documentation whenever deemed necessary.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  7. Guest Responsibility for Property Damage
                </h3>
                <p>
                  Guests shall be fully responsible for any damage, destruction,
                  or loss caused to the hotel's property during their stay. The
                  hotel reserves the right to recover the full cost of repair,
                  replacement, or restoration from the guest.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  8. Additional Guests and Special Requests
                </h3>
                <p>
                  Requests for additional guests, extra beds, room upgrades, or
                  other special accommodations are subject to availability and
                  the policies of the respective hotel. Additional charges may
                  apply where applicable.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  9. Force Majeure
                </h3>
                <p>
                  Hang Out Tourist shall not be liable for any delay,
                  interruption, modification, or cancellation of services
                  resulting from events beyond its reasonable control, including
                  but not limited to natural disasters, severe weather
                  conditions, government actions, public health emergencies,
                  civil unrest, transportation disruptions, or any other force
                  majeure event. In such circumstances, Hang Out Tourist will
                  make reasonable efforts to assist guests in accordance with
                  the policies of the respective hotel.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  10. Role of Hang Out Tourist
                </h3>
                <p>
                  Hang Out Tourist acts solely as an intermediary booking
                  platform connecting guests with hotel service providers. We do
                  not own, operate, or manage the hotels listed on our platform.
                  Accordingly, the quality, availability, safety, facilities,
                  pricing, and delivery of hotel services remain the sole
                  responsibility of the respective hotel.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  11. Limitation of Liability
                </h3>
                <p>
                  To the fullest extent permitted by applicable law, Hang Out
                  Tourist shall not be liable for any direct, indirect,
                  incidental, consequential, or special damages arising out of
                  or relating to the guest's stay, hotel services, cancellation,
                  delays, service deficiencies, or any acts or omissions of the
                  hotel or third-party service providers.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  12. Acceptance of Terms
                </h3>
                <p>
                  By confirming a reservation through Hang Out Tourist, the
                  guest acknowledges that they have carefully read, understood,
                  and accepted these Terms & Conditions. The guest further
                  agrees to comply with the policies and regulations of the
                  respective hotel throughout their stay.
                </p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Cancellation & Refund Policy
            </DialogTitle>
            <DialogDescription>
              Please review our cancellation and refund policies before
              confirming your booking.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6 text-sm leading-7 text-muted-foreground">
              <p>
                At <strong className="text-foreground">Hang Out Tourist</strong>
                , we understand that travel plans may change. This policy
                explains the conditions governing reservation cancellations,
                booking modifications, and refunds for hotel bookings made
                through our platform.
              </p>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  1. Cancellation Requests
                </h3>
                <p>
                  All cancellation requests must be submitted before the
                  scheduled check-in time through our official communication
                  channels, including email, WhatsApp, or other approved contact
                  methods. A cancellation request becomes valid only after
                  confirmation from our Customer Support team.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  2. Cancellation & Refund Eligibility
                </h3>

                <ul className="list-disc pl-5 space-y-3">
                  <li>
                    <strong>48 Hours or More Before Check-In:</strong> Guests
                    are eligible for a refund after deducting applicable payment
                    gateway fees, bank charges, or other non-refundable
                    transaction costs.
                  </li>

                  <li>
                    <strong>Within 48 Hours of Check-In:</strong> Reservations
                    are treated as <strong>Non-Refundable</strong>. No refund,
                    credit, or compensation will be provided unless required by
                    law or approved by the respective hotel.
                  </li>

                  <li>
                    <strong>No-Show:</strong> Failure to arrive on the scheduled
                    check-in date without prior cancellation will result in
                    automatic cancellation, and no refund or credit will be
                    issued.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  3. Booking Modifications
                </h3>

                <p>
                  Requests to modify or reschedule confirmed reservations are
                  subject to the availability, policies, and approval of the
                  respective hotel. Additional charges, rate differences, or
                  administrative fees may apply. Hang Out Tourist cannot
                  guarantee that modification requests will be accepted.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  4. Refund Processing
                </h3>

                <p>
                  Approved refunds will generally be processed within
                  <strong> 7–10 business days</strong> using the original
                  payment method whenever possible. Processing times may vary
                  depending on the bank, payment gateway, or mobile financial
                  service provider.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  5. Non-Refundable Bookings
                </h3>

                <p>
                  Reservations made under promotional offers, discounted rates,
                  holiday packages, festival campaigns, or those specifically
                  marked
                  <strong> "Non-Refundable"</strong> are not eligible for
                  cancellation, modification, or refund unless otherwise stated
                  at the time of booking.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  6. Force Majeure
                </h3>

                <p>
                  In the event of circumstances beyond reasonable control,
                  including natural disasters, government restrictions, public
                  emergencies, civil unrest, transportation disruptions, or
                  similar events, cancellation and refund decisions will follow
                  the policies of the respective hotel. Hang Out Tourist will
                  make reasonable efforts to assist guests but cannot guarantee
                  refunds unless approved by the hotel or required by law.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  7. Contact Us
                </h3>

                <p>
                  If you have any questions regarding cancellations, booking
                  modifications, or refunds, please contact our Customer Support
                  team through the official communication channels available on
                  the Hang Out Tourist website.
                </p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
