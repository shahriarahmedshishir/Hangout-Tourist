import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  FileText,
  Mail,
  MapPin,
  Phone,
  User,
  Wallet,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PackageBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const pkg = location.state?.pkg;

  const [guestDetails, setGuestDetails] = useState({
    fullName: "",
    email: user?.email || "",
    address: "",
    contactNumber: "",
    nidNumber: "",
  });
  const [travelDate, setTravelDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [peopleCount, setPeopleCount] = useState(
    pkg?.minimumPerson ? Number(pkg.minimumPerson) : 1,
  );
  const [activeTab, setActiveTab] = useState("online");
  const [manualTransactionId, setManualTransactionId] = useState("");
  const [manualMethod, setManualMethod] = useState("bkash");
  const [manualScreenshot, setManualScreenshot] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && (user.role === "hotel_staff" || user.role === "admin")) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.email) {
      setGuestDetails((prev) => ({ ...prev, email: user.email }));
    }
  }, [user?.email]);

  useEffect(() => {
    if (pkg?.minimumPerson && Number(pkg.minimumPerson) > peopleCount) {
      setPeopleCount(Number(pkg.minimumPerson));
    }
  }, [pkg?.minimumPerson]);

  if (!pkg) {
    navigate("/holidays", { replace: true });
    return null;
  }

  const minPeople = Number(pkg.minimumPerson || 1);
  const belowMinimum = Number(peopleCount) < minPeople;
  const totalAmount =
    Number(pkg.pricePerPerson || 0) * Number(peopleCount || 0);

  const validateBooking = () => {
    if (
      !guestDetails.fullName.trim() ||
      !guestDetails.email.trim() ||
      !guestDetails.address.trim() ||
      !guestDetails.contactNumber.trim() ||
      !guestDetails.nidNumber.trim()
    ) {
      setError("Please complete all guest details.");
      return false;
    }

    if (!travelDate) {
      setError("Please select your travel date.");
      return false;
    }

    if (belowMinimum) {
      setError(`Minimum ${pkg.minimumPerson} people are required.`);
      return false;
    }

    if (!termsAccepted || !policyAccepted) {
      setError("Please accept terms and policy to continue.");
      return false;
    }

    setError("");
    return true;
  };

  const handleOnlinePayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!validateBooking()) return;

    setLoading(true);
    try {
      const { paymentUrl } = await api.post("/api/payment/initiate/package", {
        packageId: pkg._id,
        travelDate,
        peopleCount,
        guestDetails,
        totalAmount,
      });
      window.location.href = paymentUrl;
    } catch (err) {
      setError(
        err.message || "Unable to start online payment. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualPayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!validateBooking()) return;
    if (!manualTransactionId.trim() || !manualScreenshot.trim()) {
      setError("Please provide transaction ID and screenshot link.");
      return;
    }

    setLoading(true);
    try {
      const bookingRes = await api.post(
        "/api/manual-payment/initiate/package",
        {
          packageId: pkg._id,
          travelDate,
          peopleCount,
          guestDetails,
          totalAmount,
        },
      );

      await api.post("/api/manual-payment/submit", {
        bookingId: bookingRes.bookingId,
        paymentMethod: manualMethod,
        transactionId: manualTransactionId,
        screenshot: manualScreenshot,
      });

      toast({
        title: "Payment Submitted",
        description:
          "Your manual payment is submitted. Verification will complete shortly.",
        duration: 3000,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Unable to submit manual payment.");
    } finally {
      setLoading(false);
    }
  };

  const handleCoinPayment = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!validateBooking()) return;

    setLoading(true);
    try {
      const bookingRes = await api.post(
        "/api/hangcoin/initiate-booking/package",
        {
          packageId: pkg._id,
          travelDate,
          peopleCount,
          guestDetails,
          totalAmount,
        },
      );

      await api.post(`/api/hangcoin/pay-booking/${bookingRes.bookingId}`);

      toast({
        title: "Payment Successful",
        description: `Booking confirmed using hangcoin. ৳${totalAmount.toLocaleString()} has been deducted.`,
        duration: 3000,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Unable to pay with hangcoin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-10 text-white shadow-xl shadow-slate-900/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-sky-300">
                Holiday Package Booking
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight">
                {pkg.name}
              </h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                {pkg.description ||
                  "Complete your package booking and pay securely."}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-right">
              <p className="text-sm text-slate-400">Duration</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {pkg.duration || "Flexible"}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Starts from {new Date(travelDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6 rounded-3xl border border-slate-200/10 bg-white/80 p-8 shadow-xl shadow-slate-900/10">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5">
                <p className="text-sm text-slate-500">Package</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {pkg.name}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5">
                <p className="text-sm text-slate-500">Price / Person</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  ৳{Number(pkg.pricePerPerson).toLocaleString()}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5">
                <p className="text-sm text-slate-500">Minimum People</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {pkg.minimumPerson || 1}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5">
                <p className="text-sm text-slate-500">Transportation</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {pkg.transportation || "Included"}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white p-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Package details
              </h2>
              <div className="mt-4 space-y-3 text-slate-700">
                <p>
                  <span className="font-semibold">Hotel:</span>{" "}
                  {pkg.hotel || "Included"}
                </p>
                <p>
                  <span className="font-semibold">Meals:</span>{" "}
                  {pkg.meal || "Included"}
                </p>
                <p>
                  <span className="font-semibold">Local transport:</span>{" "}
                  {pkg.localTransport || "Included"}
                </p>
                {pkg.additionalInfo ? (
                  <p>
                    <span className="font-semibold">Info:</span>{" "}
                    {pkg.additionalInfo}
                  </p>
                ) : null}
                <details className="rounded-3xl border border-slate-200/80 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    Package Description
                  </summary>
                  <p className="mt-3 text-sm text-slate-700">
                    {pkg.description ||
                      "No description has been provided for this package."}
                  </p>
                </details>
                <details className="rounded-3xl border border-slate-200/80 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    Terms & Conditions
                  </summary>
                  <p className="mt-3 text-sm text-slate-700">
                    {pkg.termsAndConditions ||
                      "No terms and conditions have been provided for this package."}
                  </p>
                </details>
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-slate-200/10 bg-slate-950/90 p-8 text-white shadow-xl shadow-slate-900/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-sky-300">
                  Payment Options
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  Complete booking
                </h2>
              </div>
              <div className="rounded-full bg-slate-900 px-4 py-2 text-sm text-slate-300">
                Total: ৳{totalAmount.toLocaleString()}
              </div>
            </div>

            {error ? (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/95 p-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm text-slate-300">Full Name</label>
                  <Input
                    value={guestDetails.fullName}
                    onChange={(e) =>
                      setGuestDetails((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-slate-300">Email</label>
                  <Input
                    value={guestDetails.email}
                    readOnly
                    disabled
                    className="bg-slate-700 border-slate-600 text-slate-300 cursor-not-allowed"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-slate-300">
                    Contact Number
                  </label>
                  <Input
                    value={guestDetails.contactNumber}
                    onChange={(e) =>
                      setGuestDetails((prev) => ({
                        ...prev,
                        contactNumber: e.target.value,
                      }))
                    }
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-slate-300">Address</label>
                  <Input
                    value={guestDetails.address}
                    onChange={(e) =>
                      setGuestDetails((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-slate-300">NID Number</label>
                  <Input
                    value={guestDetails.nidNumber}
                    onChange={(e) =>
                      setGuestDetails((prev) => ({
                        ...prev,
                        nidNumber: e.target.value,
                      }))
                    }
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-3xl border border-slate-800/80 bg-slate-900/95 p-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm text-slate-400">Travel Date</label>
                  <input
                    type="date"
                    value={travelDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-slate-300">People</label>
                  <input
                    type="number"
                    min="1"
                    value={peopleCount}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 1;
                      setPeopleCount(value);
                    }}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                  />
                  {belowMinimum ? (
                    <p className="text-sm text-amber-400 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      You cannot select lower than {minPeople} people. Minimum
                      is required.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 rounded-3xl bg-slate-900/90 p-1">
                <TabsTrigger value="online" className="rounded-3xl">
                  <CreditCard className="mr-2 inline-block h-4 w-4" />
                  Online
                </TabsTrigger>
                <TabsTrigger value="manual" className="rounded-3xl">
                  <Wallet className="mr-2 inline-block h-4 w-4" />
                  Manual
                </TabsTrigger>
                <TabsTrigger value="coins" className="rounded-3xl">
                  <Check className="mr-2 inline-block h-4 w-4" />
                  Hangcoin
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="online"
                className="rounded-3xl border border-slate-800/80 bg-slate-950/95 p-6"
              >
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Pay instantly through our secure gateway.
                  </p>
                  <Button
                    onClick={handleOnlinePayment}
                    disabled={loading || belowMinimum}
                    className="w-full"
                  >
                    Pay ৳{totalAmount.toLocaleString()} Now
                  </Button>
                </div>
              </TabsContent>

              <TabsContent
                value="manual"
                className="rounded-3xl border border-slate-800/80 bg-slate-950/95 p-6"
              >
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm text-slate-400">
                        Transaction ID
                      </label>
                      <Input
                        value={manualTransactionId}
                        onChange={(e) => setManualTransactionId(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-slate-400">
                        Payment Method
                      </label>
                      <select
                        value={manualMethod}
                        onChange={(e) => setManualMethod(e.target.value)}
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none"
                      >
                        <option value="bkash">BKash</option>
                        <option value="nagad">Nagad</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm text-slate-400">
                        Screenshot URL
                      </label>
                      <Input
                        value={manualScreenshot}
                        onChange={(e) => setManualScreenshot(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleManualPayment}
                    disabled={loading || belowMinimum}
                    className="w-full"
                  >
                    Submit Manual Payment
                  </Button>
                </div>
              </TabsContent>

              <TabsContent
                value="coins"
                className="rounded-3xl border border-slate-800/80 bg-slate-950/95 p-6"
              >
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Use your hangcoin balance to pay instantly.
                  </p>
                  <Button
                    onClick={handleCoinPayment}
                    disabled={loading || belowMinimum}
                    className="w-full"
                  >
                    Pay with Hangcoin
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-3 rounded-3xl border border-slate-800/80 bg-slate-900/95 p-6 text-slate-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-1 h-5 w-5 text-amber-400" />
                <div>
                  <p className="font-semibold text-white">Important</p>
                  <p className="text-sm leading-6">
                    Please keep your booking details accurate. Once payment is
                    confirmed, your holiday package will be reserved.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <Checkbox
                    checked={termsAccepted}
                    onCheckedChange={(checked) =>
                      setTermsAccepted(Boolean(checked))
                    }
                  />
                  I agree to the
                  <button
                    type="button"
                    onClick={() => setShowTermsDialog(true)}
                    className="text-sky-300 underline underline-offset-4"
                  >
                    Terms & Conditions
                  </button>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <Checkbox
                    checked={policyAccepted}
                    onCheckedChange={(checked) =>
                      setPolicyAccepted(Boolean(checked))
                    }
                  />
                  I agree to the
                  <button
                    type="button"
                    onClick={() => setShowPolicyDialog(true)}
                    className="text-sky-300 underline underline-offset-4"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terms & Conditions</DialogTitle>
            <DialogDescription>
              Please review the package terms and conditions before booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-6 text-slate-700">
            <p>
              {pkg.termsAndConditions ||
                "Terms and conditions are not available for this package."}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
            <DialogDescription>
              Your booking information is handled safely and securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-6 text-slate-700">
            <p>
              Your personal and booking details will only be used to process
              your package reservation and payment.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
