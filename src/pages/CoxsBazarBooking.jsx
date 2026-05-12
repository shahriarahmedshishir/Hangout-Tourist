import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  Users,
  Fuel,
  MapPin,
  Calendar,
  Phone,
  ChevronLeft,
  ChevronRight,
  Upload,
  Coins,
} from "lucide-react";

const CoxsBazarBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { service } = location.state || {};

  const [pickupDate, setPickupDate] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState("online");
  const [dateAvailableCars, setDateAvailableCars] = useState(
    service?.availableCars || 0,
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);

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

  // Fetch availability for selected date
  useEffect(() => {
    if (pickupDate && service?._id) {
      checkDateAvailability();
    }
  }, [pickupDate]);

  const checkDateAvailability = async () => {
    try {
      setCheckingAvailability(true);
      const response = await api.get(
        `/api/carrent/${service._id}?date=${pickupDate}`,
      );
      setDateAvailableCars(response.availableCars || 0);
    } catch (err) {
      console.error("Failed to check availability:", err);
      setDateAvailableCars(0);
    } finally {
      setCheckingAvailability(false);
    }
  };

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

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No service selected.</p>
            <Button asChild>
              <Link to="/cars">Browse Cox's Bazar Services</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Validation function
  const validateBooking = () => {
    if (!pickupDate) {
      setError("Please select a pickup date.");
      return false;
    }
    if (dateAvailableCars <= 0) {
      setError(`No cars available for the selected date.`);
      return false;
    }
    if (!contactNumber.trim()) {
      setError("Please enter contact number.");
      return false;
    }
    setError("");
    return true;
  };

  // Calculate return date as next day (same-day return)
  const getReturnDate = () => {
    if (!pickupDate) return "";
    const pickup = new Date(pickupDate);
    const returnDateObj = new Date(pickup);
    returnDateObj.setDate(returnDateObj.getDate() + 1);
    return returnDateObj.toISOString().split("T")[0];
  };

  const pricePerCar = service.price || 0;
  const total = pricePerCar;

  // Handle Online Payment (SSL Commerz)
  const handleOnlinePayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!validateBooking()) {
      return;
    }

    setLoading(true);
    try {
      const { paymentUrl } = await api.post("/api/payment/initiate/carrent", {
        serviceId: service._id,
        pickupDate,
        returnDate: getReturnDate(),
        seatsBooked: 1,
        pickupLocation: pickupLocation.trim(),
        contactNumber: contactNumber.trim(),
        totalAmount: total,
      });
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
      !validateBooking() ||
      !manualTransactionId.trim() ||
      !manualScreenshot
    ) {
      setError("Please fill all fields and upload screenshot.");
      return;
    }

    setLoading(true);
    try {
      // First, initiate a pending booking
      const bookingRes = await api.post(
        "/api/manual-payment/initiate/carrent",
        {
          serviceId: service._id,
          pickupDate,
          returnDate: getReturnDate(),
          seatsBooked: 1,
          pickupLocation: pickupLocation.trim(),
          contactNumber: contactNumber.trim(),
        },
      );

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
    if (!validateBooking()) {
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
    try {
      // Initiate coin payment booking
      const bookingRes = await api.post(
        "/api/hangcoin/initiate-booking/carrent",
        {
          serviceId: service._id,
          pickupDate,
          returnDate: getReturnDate(),
          seatsBooked: 1,
          pickupLocation: pickupLocation.trim(),
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
          title: "Insufficient Balance",
          description: err.message,
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 container py-8">
        <Link
          to="/cars"
          className="mb-6 inline-flex items-center gap-2 text-primary hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Cox's Bazar Services
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Service Details */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              {/* Images Carousel */}
              {service.images && service.images.length > 0 && (
                <div className="mb-6">
                  <div className="relative mb-3 overflow-hidden rounded-xl bg-muted">
                    <img
                      src={imgUrl(service.images[activeImg])}
                      alt="Service"
                      className="h-80 w-full object-cover"
                    />
                  </div>
                  {service.images.length > 1 && (
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() =>
                          setActiveImg(
                            (p) =>
                              (p - 1 + service.images.length) %
                              service.images.length,
                          )
                        }
                        className="rounded-lg p-2 hover:bg-muted"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="flex gap-2">
                        {service.images.map((_, idx) => (
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
                          setActiveImg((p) => (p + 1) % service.images.length)
                        }
                        className="rounded-lg p-2 hover:bg-muted"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Service Info */}
              <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
                {service.name}
              </h1>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span>{service.type || "Standard"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Fuel className="h-4 w-4" />
                  <span>{service.fuel || "Petrol"}</span>
                </div>
                <div className="font-medium text-foreground">
                  ৳{service.price}/Car
                </div>
                <div
                  className={`font-medium ${dateAvailableCars > 0 ? "text-success" : "text-destructive"}`}
                >
                  {pickupDate
                    ? `${dateAvailableCars} car(s) available`
                    : "Select a date to check availability"}
                </div>
              </div>

              {/* Routes */}
              {service.places && service.places.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-foreground">
                    Available Routes
                  </h3>
                  <div className="space-y-1">
                    {service.places.map((place, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <MapPin className="h-4 w-4" />
                        {place}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card h-fit sticky top-8">
            <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
              Book Now
            </h2>

            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Booking Form */}
            <div className="space-y-4 mb-6">
              {/* Pickup Date */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Pickup Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="bg-muted border-0 focus:ring-2 focus:ring-primary"
                />
                {pickupDate && (
                  <p
                    className={`mt-1 text-xs font-medium ${dateAvailableCars > 0 ? "text-success" : "text-destructive"}`}
                  >
                    {checkingAvailability
                      ? "Checking availability..."
                      : `${dateAvailableCars} car(s) available on this date`}
                  </p>
                )}
              </div>

              {/* Pickup Location */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Pickup Location
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Hotel Name or Address"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="bg-muted border-0 focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Contact Number <span className="text-destructive">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="bg-muted border-0 focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="mb-6 space-y-2 rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  ৳{pricePerCar.toLocaleString()} per car
                </span>
                <span className="font-medium">৳{total.toLocaleString()}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg text-primary">
                  ৳{total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="online">Online</TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="coin">Coin</TabsTrigger>
              </TabsList>

              {/* Online Payment Tab */}
              <TabsContent value="online" className="space-y-3">
                <Button
                  onClick={handleOnlinePayment}
                  disabled={loading || !pickupDate || dateAvailableCars <= 0}
                  className="w-full bg-gradient-primary text-primary-foreground"
                >
                  {loading ? "Processing..." : "Pay with SSL Commerz"}
                </Button>
              </TabsContent>

              {/* Manual Payment Tab */}
              <TabsContent value="manual" className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Payment Method
                  </label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value)}
                    className="w-full bg-muted border-0 focus:ring-2 focus:ring-primary rounded-md px-3 py-2"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Transaction ID
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter transaction ID"
                    value={manualTransactionId}
                    onChange={(e) => setManualTransactionId(e.target.value)}
                    className="bg-muted border-0 focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Payment Screenshot
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setManualScreenshot(
                          e.target.files?.[0]
                            ? `file://${URL.createObjectURL(e.target.files[0])}`
                            : "",
                        )
                      }
                      className="hidden"
                      id="screenshot-upload"
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted p-6 cursor-pointer hover:bg-muted/80 transition"
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {manualScreenshot
                          ? "Screenshot uploaded"
                          : "Click to upload"}
                      </span>
                    </label>
                  </div>
                </div>
                <Button
                  onClick={handleManualPayment}
                  disabled={loading || !pickupDate || dateAvailableCars <= 0}
                  className="w-full bg-gradient-primary text-primary-foreground"
                >
                  {loading ? "Submitting..." : "Submit Payment"}
                </Button>
              </TabsContent>

              {/* Coin Payment Tab */}
              <TabsContent value="coin" className="space-y-3">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-sm text-muted-foreground mb-1">
                    Your Coin Balance
                  </div>
                  <div className="text-xl font-bold text-primary">
                    ৳{coinBalance.toLocaleString()}
                  </div>
                </div>
                <Button
                  onClick={handleCoinPayment}
                  disabled={
                    coinLoading ||
                    !pickupDate ||
                    coinBalance < total ||
                    dateAvailableCars <= 0
                  }
                  className="w-full bg-gradient-primary text-primary-foreground"
                >
                  {coinLoading
                    ? "Processing..."
                    : `Pay ৳${total.toLocaleString()} with Coins`}
                </Button>
                {coinBalance < total && (
                  <p className="text-xs text-destructive">
                    Not enough coins. You need ৳
                    {(total - coinBalance).toLocaleString()} more.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CoxsBazarBooking;
