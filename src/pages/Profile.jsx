import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  User,
  Coins,
  Upload,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "balance",
  );

  // States for coin top-up
  const [coinBalance, setCoinBalance] = useState(0);
  const [topupAmount, setTopupAmount] = useState(
    searchParams.get("amount") || "",
  );
  const [topupTransactionId, setTopupTransactionId] = useState("");
  const [topupProvider, setTopupProvider] = useState("bkash");
  const [topupScreenshot, setTopupScreenshot] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState("");

  // States for topup history
  const [topupHistory, setTopupHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === "user") {
      fetchCoinBalance();
      fetchTopupHistory();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "user")) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const fetchCoinBalance = async () => {
    try {
      const response = await api.get("/api/hangcoin/balance");
      setCoinBalance(response.balance || 0);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  };

  const fetchTopupHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get("/api/hangcoin/topup/my-requests");
      setTopupHistory(response || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (warn if > 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setTopupError(
          "Image is too large (max 10MB). Please use a smaller image.",
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        console.log("Screenshot loaded:", {
          fileName: file.name,
          fileSize: file.size,
          base64Length: base64.length,
        });
        setTopupScreenshot(base64);
      };
      reader.onerror = () => {
        setTopupError("Failed to read image file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualTopup = async (e) => {
    e.preventDefault();
    setTopupError("");

    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      setTopupError("Please enter a valid amount");
      return;
    }
    if (!topupTransactionId.trim()) {
      setTopupError("Please enter transaction ID");
      return;
    }
    if (!topupScreenshot) {
      setTopupError("Please upload payment screenshot");
      return;
    }

    setTopupLoading(true);
    try {
      console.log(
        "Submitting manual top-up with screenshot size:",
        topupScreenshot.length,
        "bytes",
      );
      const response = await api.post("/api/hangcoin/topup/submit", {
        amount: parseFloat(topupAmount),
        paymentMethod: "manual",
        transactionId: topupTransactionId,
        screenshot: topupScreenshot,
        provider: topupProvider,
      });
      console.log("Manual top-up submitted successfully:", response);

      toast({
        title: "Top-up Submitted",
        description: "Your top-up request is pending admin approval.",
        duration: 3000,
      });

      // Reset form
      setTopupAmount("");
      setTopupTransactionId("");
      setTopupProvider("bkash");
      setTopupScreenshot("");
      setActiveTab("history");
      fetchTopupHistory();
    } catch (err) {
      console.error("Top-up submission error:", {
        message: err.message,
        status: err.status,
        error: err,
      });
      setTopupError(err.message || "Failed to submit top-up");
    } finally {
      setTopupLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-50 border-green-200 text-green-800";
      case "rejected":
        return "bg-red-50 border-red-200 text-red-800";
      case "pending":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || user.role !== "user") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="max-w-2xl mx-auto">
          <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">
            My Profile
          </h1>

          {/* User Info Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card mb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-white text-lg font-bold">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-lg font-bold text-foreground">
                  {user.name}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="balance" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Coin Balance
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Top-up History
              </TabsTrigger>
            </TabsList>

            {/* Coin Balance Tab */}
            <TabsContent value="balance" className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Coins className="h-6 w-6 text-primary" />
                    <text className="text-sm text-muted-foreground">
                      Available Balance
                    </text>
                  </div>
                  <p className="font-heading text-5xl font-bold text-primary">
                    {coinBalance}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    1 Hangcoin = ৳1
                  </p>
                </div>

                <div className="bg-gradient-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-sm mb-2 text-foreground">
                    How to use Hangcoins
                  </h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Use coins to book hotels and cars</li>
                    <li>✓ 1 coin = 1 BDT</li>
                    <li>✓ No expiry date</li>
                    <li>✓ Can be used immediately after approval</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Top-up Method
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        setActiveTab("history");
                        setTopupAmount("");
                        setActiveTab("history");
                      }}
                      variant="outline"
                      className="flex flex-col gap-2 h-auto py-4"
                    >
                      <p className="font-medium">SSL Commerz</p>
                      <p className="text-xs text-muted-foreground">Instant</p>
                    </Button>
                    <Button
                      onClick={() => {
                        setActiveTab("history");
                        setTopupAmount("");
                      }}
                      variant="outline"
                      className="flex flex-col gap-2 h-auto py-4"
                    >
                      <p className="font-medium">Manual Payment</p>
                      <p className="text-xs text-muted-foreground">
                        Bkash/Nagad
                      </p>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Top-up History Tab */}
            <TabsContent value="history" className="space-y-6">
              {/* Manual Top-up Form */}
              {!topupAmount && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <h3 className="font-heading text-lg font-bold mb-4 text-foreground">
                    Manual Top-up (Bkash/Nagad)
                  </h3>

                  <form onSubmit={handleManualTopup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Amount (BDT) *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Enter amount"
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                        className="text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Payment Method *
                      </label>
                      <select
                        value={topupProvider}
                        onChange={(e) => setTopupProvider(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      >
                        <option value="bkash">Bkash</option>
                        <option value="nagad">Nagad</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Transaction ID *
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., BKT12345678"
                        value={topupTransactionId}
                        onChange={(e) => setTopupTransactionId(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Payment Screenshot *
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-primary cursor-pointer hover:bg-muted transition-colors">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">
                            {topupScreenshot ? "Change Image" : "Upload Image"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotUpload}
                            className="hidden"
                          />
                        </label>
                        {topupScreenshot && (
                          <span className="text-xs text-green-600">
                            ✓ Image uploaded
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">
                        Important:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Upload clear screenshot of payment confirmation</li>
                        <li>Include transaction ID in the screenshot</li>
                        <li>Admin will verify and approve within 24 hours</li>
                      </ul>
                    </div>

                    {topupError && (
                      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {topupError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setActiveTab("balance");
                          setTopupAmount("");
                          setTopupMethod("ssl");
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={topupLoading}
                        className="flex-1 bg-gradient-primary text-primary-foreground"
                      >
                        {topupLoading ? "Submitting..." : "Submit Top-up"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Top-up History List */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="font-heading text-lg font-bold mb-4 text-foreground">
                  Top-up Requests
                </h3>

                {historyLoading ? (
                  <p className="text-muted-foreground text-sm">Loading...</p>
                ) : topupHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No top-up requests yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topupHistory.map((request) => (
                      <div
                        key={request._id}
                        className={`rounded-lg border p-4 flex items-center justify-between ${getStatusColor(
                          request.status,
                        )}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(request.status)}
                            <p className="font-semibold text-sm">
                              ৳{request.amount.toLocaleString()} coins
                            </p>
                          </div>
                          <div className="text-xs space-y-0.5">
                            <p>
                              Method:{" "}
                              <span className="font-medium capitalize">
                                {request.paymentMethod}
                              </span>
                            </p>
                            <p>
                              Submitted:{" "}
                              {new Date(request.submittedAt).toLocaleDateString(
                                "en-GB",
                              )}
                            </p>
                            {request.status === "rejected" &&
                              request.rejectionReason && (
                                <p className="mt-2 font-semibold">
                                  Reason: {request.rejectionReason}
                                </p>
                              )}
                          </div>
                        </div>
                        <span className="font-semibold text-sm capitalize">
                          {request.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
}
