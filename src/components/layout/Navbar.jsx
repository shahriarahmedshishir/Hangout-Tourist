import { useState } from "react";
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
  { path: "/flights", label: "Flights" },
  { path: "/hotels", label: "Hotels" },
  { path: "/holidays", label: "Holidays" },
  { path: "/visa", label: "Visa" },
  { path: "/cars", label: "Cars" },
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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border bg-card shadow-elevated">
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
            {visibleNavLinks.length > 0 && (
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
    </nav>
  );
};
export default Navbar;
