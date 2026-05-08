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
      !guestDetails.contactNumber.trim()
    ) {
      setError("Please fill all guest details.");
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
                  <CalendarCheck className="h-5 w-5 text-primary" /> Stay Details
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
                          handleGuestDetailsChange("contactNumber", e.target.value)
                        }
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
                        Room {r.roomNumber} — ৳{(r.price || 0).toLocaleString()} ×{" "}
                        {days} {days === 1 ? "night" : "nights"}
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
              <TabsContent value="manual" className="space-y-4 mt-6">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Manual Payment Submission
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Pay via Bkash or Nagad and submit your transaction details
                    for verification.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Payment Method *
                    </label>
                    <select
                      value={manualMethod}
                      onChange={(e) => setManualMethod(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="bkash">🏦 Bkash</option>
                      <option value="nagad">📱 Nagad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Transaction ID *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., ABC123XYZ456"
                      value={manualTransactionId}
                      onChange={(e) => setManualTransactionId(e.target.value)}
                      className="bg-muted h-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Payment Proof Screenshot *
                  </label>
                  <div className="rounded-lg border-2 border-dashed border-primary/30 p-6 text-center hover:border-primary/50 transition-colors">
                    <label className="cursor-pointer block">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-primary" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            {manualScreenshot ? "Image Uploaded" : "Upload Screenshot"}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {manualScreenshot && (
                    <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Image successfully uploaded
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-semibold text-foreground mb-3">
                    📋 Submission Steps:
                  </p>
                  <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside">
                    <li>Transfer amount via Bkash or Nagad</li>
                    <li>Note the transaction ID from confirmation</li>
                    <li>Take a screenshot of payment confirmation</li>
                    <li>Upload the screenshot here</li>
                    <li>Wait for admin verification (check dashboard)</li>
                  </ol>
                </div>

                <Button
                  onClick={handleManualPayment}
                  disabled={loading || !termsAccepted || !policyAccepted}
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-6 text-lg font-semibold rounded-xl"
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
                      disabled={coinLoading || !termsAccepted || !policyAccepted}
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
                          You need ৳{(total - coinBalance).toLocaleString()} more
                          coins
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
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Hotel Booking Terms & Conditions
            </DialogTitle>
            <DialogDescription>
              Please read these terms carefully before booking
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="font-bold text-foreground mb-2">
                  1. Booking & Reservation
                </h3>
                <p>
                  By making a reservation through our platform, you agree to
                  these terms and conditions. All bookings are subject to
                  availability and confirmation by the hotel.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  2. Payment Terms
                </h3>
                <p>
                  Full payment is required to confirm your reservation. We
                  accept online payments via SSLCommerz, manual payments through
                  Bkash/Nagad, and Hangcoin payments.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  3. Check-In & Check-Out
                </h3>
                <p>
                  Standard check-in time is 2:00 PM and check-out time is 12:00
                  PM. Early check-in and late check-out may be available subject
                  to availability and additional charges.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  4. Cancellation Policy
                </h3>
                <p>
                  Cancellations must be made at least 48 hours before check-in
                  for a full refund. Cancellations made within 48 hours may
                  incur charges.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  5. Guest Conduct
                </h3>
                <p>
                  Guests must conduct themselves in a manner that respects other
                  guests and hotel staff. The hotel reserves the right to refuse
                  service or terminate stays for unacceptable behavior.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  6. Room Facilities
                </h3>
                <p>
                  Guests are responsible for any damage to room facilities
                  beyond normal wear and tear. Additional charges may apply for
                  damages.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  7. Liability
                </h3>
                <p>
                  The hotel is not responsible for loss, theft, or damage to
                  personal belongings. Please use the hotel safe for valuables.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  8. Modifications
                </h3>
                <p>
                  We reserve the right to modify these terms at any time. Your
                  continued use of our booking platform constitutes acceptance
                  of any changes.
                </p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Policy Dialog */}
      <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Privacy & Cancellation Policy
            </DialogTitle>
            <DialogDescription>
              Your data and booking protection
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="font-bold text-foreground mb-2">
                  1. Privacy & Data Protection
                </h3>
                <p>
                  We collect your personal information solely to process your
                  booking and provide hotel services. Your data is encrypted and
                  protected according to international standards.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  2. Information Usage
                </h3>
                <p>
                  Your personal information will not be shared with third
                  parties without your consent, except where necessary to
                  complete your booking (hotel staff, payment processors).
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  3. Refund Policy
                </h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    Cancellations 48+ hours before check-in: Full refund
                  </li>
                  <li>
                    Cancellations 24-48 hours before check-in: 50% refund
                  </li>
                  <li>
                    Cancellations less than 24 hours: No refund
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  4. Payment Security
                </h3>
                <p>
                  All online payments are processed through secure payment
                  gateways (SSLCommerz). We do not store credit card
                  information.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  5. Cookies & Tracking
                </h3>
                <p>
                  Our platform uses cookies to enhance user experience and track
                  booking patterns. You can disable cookies in your browser
                  settings.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  6. Data Retention
                </h3>
                <p>
                  We retain your booking information for 7 years for record
                  keeping and dispute resolution. You can request data deletion
                  after 1 year.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  7. Special Requests
                </h3>
                <p>
                  Special requests (early check-in, high floor, etc.) are noted
                  but not guaranteed. The hotel will accommodate based on
                  availability.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">
                  8. Contact & Disputes
                </h3>
                <p>
                  For cancellations or disputes, please contact our support
                  team at support@hangcoin.com within 30 days of your booking.
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
