import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  User,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  KeyRound,
  Eye,
  EyeOff,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import logo from "@/assets/logo.png";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const navLinks = [
  { path: "/hotels", label: "Hotels" },
  { path: "/cars", label: "Cars" },
  { path: "/flights", label: "Flights" },
  { path: "/holidays", label: "Holidays" },
  { path: "/visa", label: "Visa" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwShow, setPwShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [coinBalance, setCoinBalance] = useState(0);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupMethod, setTopupMethod] = useState("ssl");
  const [topupTransactionId, setTopupTransactionId] = useState("");
  const [topupPaymentMethod, setTopupPaymentMethod] = useState("bkash");
  const [topupScreenshot, setTopupScreenshot] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Fetch coin balance for regular users
  useEffect(() => {
    if (user && user.role === "user") {
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

  const isStaff = user?.role === "hotel_staff";
  const isAdmin = user?.role === "admin";
  // Staff and admin don't see public nav links
  const visibleNavLinks = isStaff || isAdmin ? [] : navLinks;

  const openChangePw = () => {
    setPwForm({ current: "", next: "", confirm: "" });
    setPwError("");
    setPwSuccess("");
    setUserMenuOpen(false);
    setMobileOpen(false);
    setPwOpen(true);
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.next !== pwForm.confirm) {
      setPwError("New passwords do not match");
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/api/auth/change-password", {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      setPwSuccess("Password changed successfully!");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwError(err.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  const handleTopupSubmit = async () => {
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      setTopupError("Please enter a valid amount");
      return;
    }

    setTopupLoading(true);
    setTopupError("");

    try {
      if (topupMethod === "ssl") {
        // Initiate SSL Commerz payment - will be auto-approved after payment
        const response = await api.post("/api/payment/initiate/coin-topup", {
          amount: parseFloat(topupAmount),
        });
        window.location.href = response.paymentUrl;
      } else {
        // Manual payment submission with screenshot
        if (!topupTransactionId.trim()) {
          setTopupError("Please enter transaction ID");
          setTopupLoading(false);
          return;
        }
        if (!topupScreenshot) {
          setTopupError("Please upload payment screenshot");
          setTopupLoading(false);
          return;
        }

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
            provider: topupPaymentMethod, // "bkash" or "nagad"
          });
          console.log("Manual top-up submitted successfully:", response);

          // Reset form and close modal
          setTopupOpen(false);
          setTopupAmount("");
          setTopupTransactionId("");
          setTopupPaymentMethod("bkash");
          setTopupScreenshot("");
        } catch (submitErr) {
          console.error("Manual top-up submission error:", submitErr);
          throw submitErr;
        }
      }
    } catch (err) {
      console.error("Top-up error details:", {
        message: err.message,
        status: err.status,
        error: err,
      });
      setTopupError(err.message || "Failed to submit top-up");
    } finally {
      setTopupLoading(false);
    }
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (warn if > 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setTopupError(
          "Image is too large (max 2MB). Please use a smaller image.",
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

  const dashboardLink =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "hotel_staff"
        ? "/staff"
        : "/dashboard";
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Hangout Tourist" className="h-9 w-9" />
          <span className="font-heading text-xl font-bold text-foreground">
            Hangout <span className="text-gradient-primary">Tourist</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
              location.pathname === "/"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            Home
          </Link>
          {visibleNavLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                location.pathname === link.path
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-white text-xs font-bold">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="max-w-[120px] truncate">{user.name}</span>
                {user.role === "user" && coinBalance > 0 && (
                  <div className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full bg-primary/10">
                    <Coins className="h-3 w-3 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {coinBalance}
                    </span>
                  </div>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border bg-card shadow-elevated">
                  {user.role === "user" && (
                    <div className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-border">
                      <span className="text-muted-foreground">Hangcoins:</span>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-primary">
                          {coinBalance}
                        </span>
                      </div>
                    </div>
                  )}
                  <Link
                    to={dashboardLink}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent rounded-t-xl transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {user.role === "admin"
                      ? "Admin Panel"
                      : user.role === "hotel_staff"
                        ? "Staff Dashboard"
                        : "My Dashboard"}
                  </Link>
                  {user.role === "user" && (
                    <button
                      onClick={() => {
                        setTopupOpen(true);
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <Coins className="h-4 w-4" /> Top Up Coins
                    </button>
                  )}
                  <button
                    onClick={openChangePw}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  >
                    <KeyRound className="h-4 w-4" /> Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-b-xl transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" /> Login
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="sm"
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                >
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <div className="flex flex-col gap-2">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent ${location.pathname === "/" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            >
              Home
            </Link>
            {visibleNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent ${location.pathname === link.path ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              >
                {link.label}
              </Link>
            ))}
            {(visibleNavLinks.length > 0 || true) && (
              <hr className="my-2 border-border" />
            )}
            {user ? (
              <>
                <Link to={dashboardLink} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {user.role === "admin"
                      ? "Admin Panel"
                      : user.role === "hotel_staff"
                        ? "Staff Dashboard"
                        : "My Dashboard"}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={openChangePw}
                >
                  <KeyRound className="h-4 w-4" /> Change Password
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <User className="h-4 w-4" /> Login
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full bg-gradient-primary text-primary-foreground">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Change Password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePw} className="space-y-4 mt-2">
            {[
              { key: "current", label: "Current Password" },
              { key: "next", label: "New Password" },
              { key: "confirm", label: "Confirm New Password" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {label}
                </label>
                <div className="relative">
                  <Input
                    type={pwShow[key] ? "text" : "password"}
                    value={pwForm[key]}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    placeholder={label}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setPwShow((s) => ({ ...s, [key]: !s[key] }))}
                    tabIndex={-1}
                  >
                    {pwShow[key] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-green-600">{pwSuccess}</p>}
            <Button
              type="submit"
              disabled={pwLoading}
              className="w-full bg-gradient-primary text-primary-foreground"
            >
              {pwLoading ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Coin Top-up Dialog */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" /> Top Up Hangcoins
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Amount (BDT)
              </label>
              <Input
                type="number"
                min="1"
                placeholder="Enter amount (1 = 1 coin)"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="text-base"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Payment Method
              </label>
              <div className="space-y-2">
                <div
                  className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted"
                  onClick={() => setTopupMethod("ssl")}
                >
                  <input
                    type="radio"
                    name="topupMethod"
                    value="ssl"
                    checked={topupMethod === "ssl"}
                    onChange={() => setTopupMethod("ssl")}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-medium text-sm">
                      Online Payment (SSL Commerz)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Instant & secure
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted"
                  onClick={() => setTopupMethod("manual")}
                >
                  <input
                    type="radio"
                    name="topupMethod"
                    value="manual"
                    checked={topupMethod === "manual"}
                    onChange={() => setTopupMethod("manual")}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-medium text-sm">Manual Payment</p>
                    <p className="text-xs text-muted-foreground">
                      Bkash/Nagad via screenshot
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Payment Fields */}
            {topupMethod === "manual" && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Payment Method *
                  </label>
                  <select
                    value={topupPaymentMethod}
                    onChange={(e) => setTopupPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="bkash">Bkash</option>
                    <option value="nagad">Nagad</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Transaction ID *
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., BKT123456789"
                    value={topupTransactionId}
                    onChange={(e) => setTopupTransactionId(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Payment Screenshot *
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                    <span className="text-sm text-muted-foreground">
                      {topupScreenshot ? "✓ Image uploaded" : "Click to upload"}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {topupError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {topupError}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTopupOpen(false);
                  setTopupAmount("");
                  setTopupTransactionId("");
                  setTopupPaymentMethod("bkash");
                  setTopupScreenshot("");
                  setTopupError("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTopupSubmit}
                disabled={
                  topupLoading ||
                  !topupAmount ||
                  (topupMethod === "manual" &&
                    (!topupTransactionId || !topupScreenshot))
                }
                className="flex-1 bg-gradient-primary text-primary-foreground"
              >
                {topupLoading
                  ? "Processing..."
                  : topupMethod === "ssl"
                    ? "Pay with SSL"
                    : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
};
export default Navbar;
