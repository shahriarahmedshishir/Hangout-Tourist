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
  Settings2,
  MapPin,
  Calendar,
  Phone,
  ChevronLeft,
  ChevronRight,
  Upload,
  Coins,
} from "lucide-react";

const CarBooking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { car } = location.state || {};

  const [pickupDate, setPickupDate] = useState("");
  const [daysCount, setDaysCount] = useState("");
  const [pickupArea, setPickupArea] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeImg, setActiveImg] = useState(0);
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

  if (!car) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No car selected.</p>
            <Button asChild>
              <Link to="/cars">Browse Cars</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Validation function
  const validateCarBooking = () => {
    if (!pickupDate) {
      setError("Please select a pickup date.");
      return false;
    }
    if (!daysCount || parseInt(daysCount, 10) <= 0) {
      setError("Please enter number of days (at least 1).");
      return false;
    }
    if (!pickupArea.trim() && !pickupAddress.trim()) {
      setError("Please select a pick-up area and enter your address.");
      return false;
    }
    if (!pickupAddress.trim()) {
      setError("Please enter your exact pick-up address.");
      return false;
    }
    if (!contactNumber.trim()) {
      setError("Please enter a contact number.");
      return false;
    }
    setError("");
    return true;
  };

  // Handle Online Payment (SSL Commerz)
  const handleOnlinePayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!validateCarBooking()) {
      return;
    }

    setLoading(true);
    try {
      const { paymentUrl } = await api.post("/api/payment/initiate/car", {
        carId: car._id,
        pickupDate,
        returnDate,
        pickupLocation: pickupArea
          ? `${pickupArea} — ${pickupAddress.trim()}`
          : pickupAddress.trim(),
        contactNumber: contactNumber.trim(),
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
      !validateCarBooking() ||
      !manualTransactionId.trim() ||
      !manualScreenshot
    ) {
      setError("Please fill all fields and upload screenshot.");
      return;
    }

    setLoading(true);
    try {
      // First, initiate a pending booking
      const bookingRes = await api.post("/api/manual-payment/initiate/car", {
        carId: car._id,
        pickupDate,
        returnDate,
        pickupLocation: pickupArea
          ? `${pickupArea} — ${pickupAddress.trim()}`
          : pickupAddress.trim(),
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
    if (!validateCarBooking()) {
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
      const bookingRes = await api.post("/api/hangcoin/initiate-booking/car", {
        carId: car._id,
        pickupDate,
        returnDate,
        pickupLocation: pickupArea
          ? `${pickupArea} — ${pickupAddress.trim()}`
          : pickupAddress.trim(),
        contactNumber: contactNumber.trim(),
      });

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

  if (!car) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No car selected.</p>
            <Button asChild>
              <Link to="/cars">Browse Cars</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const days = daysCount ? parseInt(daysCount, 10) : 0;
  const returnDate =
    pickupDate && days > 0
      ? new Date(new Date(pickupDate).getTime() + days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      : "";
  const total = (car.price || 0) * days;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-primary py-6">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-primary-foreground">
            Confirm Car Booking
          </h1>
        </div>
      </div>

      <div className="container py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Car Summary */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-heading text-lg font-bold text-foreground mb-4">
              Car Details
            </h2>
            {car.images?.length > 0 ? (
              <div className="mb-4 relative h-44 overflow-hidden rounded-xl">
                <img
                  src={imgUrl(car.images[activeImg])}
                  alt={car.name}
                  className="h-full w-full object-cover"
                />
                {car.images.length > 1 && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60 transition-colors"
                      onClick={() =>
                        setActiveImg(
                          (activeImg - 1 + car.images.length) %
                            car.images.length,
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60 transition-colors"
                      onClick={() =>
                        setActiveImg((activeImg + 1) % car.images.length)
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {car.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImg(idx)}
                          className={`h-1.5 w-1.5 rounded-full transition-all ${
                            idx === activeImg
                              ? "bg-white scale-125"
                              : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-muted text-6xl">
                🚗
              </div>
            )}

            <h3 className="font-heading text-xl font-bold text-foreground">
              {car.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{car.type}</p>

            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5">
                <Users className="h-3 w-3" /> {car.seats} seats
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5">
                <Settings2 className="h-3 w-3" /> {car.transmission}
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5">
                <Fuel className="h-3 w-3" /> {car.fuel}
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-primary/5 p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Price per day</span>
                <span className="font-medium">
                  ৳{(car.price || 0).toLocaleString()}
                </span>
              </div>
              {days > 0 && (
                <>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Days × {days}</span>
                    <span className="font-medium">
                      ৳{total.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-heading font-bold">
                    <span>Total (BDT)</span>
                    <span className="text-primary text-lg">
                      ৳{total.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Booking Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-heading text-lg font-bold text-foreground mb-5">
              Rental Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Pick-up Area *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  {car.places?.length > 0 ? (
                    <select
                      value={pickupArea}
                      onChange={(e) => setPickupArea(e.target.value)}
                      className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select an area</option>
                      {car.places.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      placeholder="City or area"
                      value={pickupArea}
                      onChange={(e) => setPickupArea(e.target.value)}
                      className="pl-9"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Pick-up Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. Dakhinkhan, Uttara, House 12"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Pick-up Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Number of Days *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 3"
                    value={daysCount}
                    onChange={(e) => setDaysCount(e.target.value)}
                  />
                </div>
              </div>
              {returnDate && (
                <p className="text-xs text-muted-foreground">
                  Return date:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(returnDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </p>
              )}

              {days > 0 && (
                <div className="rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <Car className="inline h-4 w-4 mr-1" /> {days} day
                  {days > 1 ? "s" : ""} rental — Total:{" "}
                  <strong className="text-foreground">
                    ৳{total.toLocaleString()}
                  </strong>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Contact Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="e.g. 01700000000"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </div>
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
                      <p className="mb-2">
                        Pay securely using SSLCommerz gateway
                      </p>
                      <p className="rounded-lg bg-muted p-2 text-xs">
                        You will be redirected to SSLCommerz secure payment
                        page.
                      </p>
                    </div>
                    <Button
                      onClick={handleOnlinePayment}
                      disabled={loading || !days}
                      className="w-full bg-gradient-primary text-primary-foreground py-5 text-base font-semibold"
                    >
                      {loading
                        ? "Redirecting..."
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
                          onChange={(e) =>
                            setManualTransactionId(e.target.value)
                          }
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
                              {manualScreenshot
                                ? "Change Image"
                                : "Upload Image"}
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
                        disabled={loading || !days}
                        className="w-full bg-gradient-primary text-primary-foreground py-5 text-base font-semibold"
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
                          disabled={coinLoading || !days}
                          className="w-full bg-gradient-primary text-primary-foreground py-5 text-base font-semibold"
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
                            You need ৳{(total - coinBalance).toLocaleString()}{" "}
                            more coins
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
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CarBooking;
