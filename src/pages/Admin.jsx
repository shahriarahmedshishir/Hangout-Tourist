import { useState, useEffect, useRef, Fragment } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Building2,
  Car,
  ShoppingCart,
  Users,
  UserPlus,
  LogOut,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Menu,
  X,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Check,
  ImageIcon,
  CalendarRange,
  Calendar,
  CreditCard,
  Coins,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/logo.png";

const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "hotels", label: "Hotels", icon: Building2 },
  { id: "cars", label: "Cars", icon: Car },
  { id: "todays-bookings", label: "Today's Bookings", icon: CalendarRange },
  { id: "bookings", label: "Bookings", icon: ShoppingCart },
  { id: "users", label: "Users", icon: Users },
  { id: "staff", label: "Add Staff", icon: UserPlus },
  { id: "manual-payments", label: "Manual Payments", icon: CreditCard },
  { id: "coin-topups", label: "Coin Top-ups", icon: Coins },
  { id: "coins-management", label: "Coins Management", icon: Coins },
  { id: "payment-history", label: "Payment History", icon: CreditCard },
];

const STATUS_COLORS = {
  confirmed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
};

const Admin = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // All hooks must be called BEFORE any conditional returns
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      if (user?.role === "hotel_staff") {
        navigate("/staff", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return null;
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-muted">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-8 w-8" />
            <span className="font-heading text-sm font-bold">Admin Panel</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setSidebarOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${view === item.id ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
          <Link to="/">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" /> Back to Site
            </Button>
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-lg font-bold capitalize text-foreground">
            {sidebarItems.find((i) => i.id === view)?.label || view}
          </h1>
        </header>
        <main className="p-6 overflow-auto">
          {view === "dashboard" && <DashboardView />}
          {view === "hotels" && <HotelsView />}
          {view === "cars" && <CarsView />}
          {view === "todays-bookings" && <TodaysBookingsView />}
          {view === "bookings" && <BookingsView />}
          {view === "users" && <UsersView />}
          {view === "staff" && <StaffView />}
          {view === "manual-payments" && <ManualPaymentsView />}
          {view === "coin-topups" && <CoinTopupsView />}
          {view === "coins-management" && <CoinsManagementView />}
          {view === "payment-history" && <PaymentHistoryView />}
        </main>
      </div>
    </div>
  );
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const DashboardView = () => {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const [s, b] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/bookings?limit=8"),
      ]);
      setStats(s);
      setBookings(b.bookings || []);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadStats().finally(() => setLoading(false));
  }, []);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  const cards = [
    {
      label: "Total Bookings",
      value: stats?.totalBookings ?? 0,
      icon: ShoppingBag,
    },
    {
      label: "Net Revenue (BDT)",
      value: `৳${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`,
      icon: DollarSign,
    },
    {
      label: "Today's Revenue",
      value: `৳${((stats?.todayRevenue || 0) / 1000).toFixed(1)}K`,
      icon: TrendingUp,
    },
    {
      label: "Today's Canceled",
      value: stats?.todayCanceled ?? 0,
      icon: UserCheck,
    },
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: UserCheck },
    {
      label: "Hotels / Cars",
      value: `${stats?.totalHotels ?? 0} / ${stats?.totalCars ?? 0}`,
      icon: TrendingUp,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Dashboard Overview
        </h2>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {refreshing ? "Refreshing..." : "🔄 Refresh"}
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 shadow-card animate-fade-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                  {c.value}
                </p>
              </div>
              <div className="rounded-xl bg-accent p-3">
                <c.icon className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-5">
          <h3 className="font-heading font-bold text-foreground">
            Recent Bookings
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  ID
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Transaction ID
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    No bookings yet
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr
                    key={b._id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {b._id.slice(-8)}
                    </td>
                    <td className="px-5 py-3 capitalize text-foreground">
                      {b.type}
                    </td>
                    <td
                      className="px-5 py-3 font-mono text-xs text-muted-foreground"
                      title={b.transactionId}
                    >
                      {b.transactionId ? b.transactionId.slice(-8) : "—"}
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">
                      ৳{b.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[b.status] || "bg-muted text-muted-foreground"}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── HOTELS ──────────────────────────────────────────────────────────────────
const HotelsView = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [roomsHotel, setRoomsHotel] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get("/api/admin/hotels")
      .then(setHotels)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const servicesRaw = fd.get("services") || "";
    fd.set(
      "services",
      JSON.stringify(
        servicesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
    try {
      form === "add"
        ? await api.postForm("/api/admin/hotels", fd)
        : await api.putForm(`/api/admin/hotels/${form._id}`, fd);
      setForm(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete hotel and all its rooms?")) return;
    try {
      await api.delete(`/api/admin/hotels/${id}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (roomsHotel)
    return (
      <RoomsView
        hotel={roomsHotel}
        onBack={() => {
          setRoomsHotel(null);
          load();
        }}
      />
    );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Hotels
        </h2>
        <Button
          className="gap-2 bg-gradient-primary text-primary-foreground"
          onClick={() => setForm("add")}
        >
          <Plus className="h-4 w-4" /> Add Hotel
        </Button>
      </div>

      {form && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-heading font-bold text-foreground">
            {form === "add" ? "Add New Hotel" : `Edit: ${form.name}`}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Hotel Name *
              </label>
              <Input
                name="name"
                defaultValue={form?.name || ""}
                required
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Area / Location
              </label>
              <Input
                name="area"
                defaultValue={form?.area || ""}
                className="bg-muted"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                Description
              </label>
              <Input
                name="description"
                defaultValue={form?.description || ""}
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Total Rooms
              </label>
              <Input
                name="totalRooms"
                type="number"
                defaultValue={form?.totalRooms || ""}
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Services (comma separated)
              </label>
              <Input
                name="services"
                defaultValue={form?.services?.join(", ") || ""}
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Hotel Image
              </label>
              <input
                type="file"
                name="image"
                accept="image/*"
                className="text-sm text-muted-foreground"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button
                type="submit"
                className="bg-gradient-primary text-primary-foreground"
              >
                {form === "add" ? "Create Hotel" : "Update Hotel"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : hotels.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No hotels yet. Add one above.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Location
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Rooms
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h) => (
                <tr
                  key={h._id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {h.image && (
                        <img
                          src={imgUrl(h.image)}
                          alt=""
                          className="h-8 w-8 rounded object-cover"
                        />
                      )}
                      <span className="font-medium text-foreground">
                        {h.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {h.area || "—"}
                  </td>
                  <td className="px-5 py-3 text-foreground">
                    {h.roomCount} / {h.totalRooms}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        title="Manage Rooms"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => setRoomsHotel(h)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        title="Edit"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => setForm(h)}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        title="Delete"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => handleDelete(h._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── ROOMS ───────────────────────────────────────────────────────────────────
const RoomsView = ({ hotel, onBack }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);
  const [blockPanel, setBlockPanel] = useState(null); // roomId with open panel
  const [blockForm, setBlockForm] = useState({ checkIn: "", checkOut: "" });
  const [blockError, setBlockError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get(`/api/admin/hotels/${hotel._id}/rooms`)
      .then(setRooms)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  // Revoke old object URLs to avoid memory leaks
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p));
  }, [previews]);

  const openForm = (value) => {
    setForm(value);
    setSelectedFiles([]);
    setPreviews([]);
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    previews.forEach((p) => URL.revokeObjectURL(p));
    setSelectedFiles(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);

    // Sync the actual file input via DataTransfer
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      newFiles.forEach((f) => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const servicesRaw = fd.get("services") || "";
    fd.set(
      "services",
      JSON.stringify(
        servicesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );
    // Re-attach files from state so removals are reflected
    fd.delete("images");
    selectedFiles.forEach((f) => fd.append("images", f));
    try {
      form === "add"
        ? await api.postForm(`/api/admin/hotels/${hotel._id}/rooms`, fd)
        : await api.putForm(`/api/admin/rooms/${form._id}`, fd);
      openForm(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this room?")) return;
    try {
      await api.delete(`/api/admin/rooms/${id}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/api/admin/rooms/${id}/toggle`, {});
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const openBlockPanel = (id) => {
    setBlockPanel(blockPanel === id ? null : id);
    setBlockForm({ checkIn: "", checkOut: "" });
    setBlockError("");
  };

  const handleAddBlock = async (roomId) => {
    if (!blockForm.checkIn || !blockForm.checkOut) {
      setBlockError("Both dates are required.");
      return;
    }
    if (new Date(blockForm.checkOut) <= new Date(blockForm.checkIn)) {
      setBlockError("Check-out must be after check-in.");
      return;
    }
    setBlockError("");
    try {
      await api.post(`/api/admin/rooms/${roomId}/blocks`, blockForm);
      setBlockForm({ checkIn: "", checkOut: "" });
      load();
    } catch (err) {
      setBlockError(err.message);
    }
  };

  const handleRemoveBlock = async (roomId, blockId) => {
    try {
      await api.delete(`/api/admin/rooms/${roomId}/blocks/${blockId}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
        <h2 className="font-heading text-lg font-bold text-foreground">
          Rooms — {hotel.name}
        </h2>
        {hotel.totalRooms > 0 && (
          <span className="text-xs text-muted-foreground">
            {rooms.length} / {hotel.totalRooms} rooms
          </span>
        )}
        <Button
          className="ml-auto gap-2 bg-gradient-primary text-primary-foreground"
          onClick={() => openForm("add")}
          disabled={hotel.totalRooms > 0 && rooms.length >= hotel.totalRooms}
          title={
            hotel.totalRooms > 0 && rooms.length >= hotel.totalRooms
              ? `Room limit reached (${hotel.totalRooms})`
              : undefined
          }
        >
          <Plus className="h-4 w-4" /> Add Room
        </Button>
      </div>

      {hotel.totalRooms > 0 && rooms.length >= hotel.totalRooms && !loading && (
        <div className="mb-4 rounded-xl bg-warning/10 px-4 py-2.5 text-sm text-warning font-medium">
          Room limit reached — this hotel has {hotel.totalRooms} room
          {hotel.totalRooms !== 1 ? "s" : ""} configured. Delete a room to add a
          new one.
        </div>
      )}

      {form && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-heading font-bold text-foreground">
            {form === "add" ? "Add Room" : `Edit Room ${form.roomNumber}`}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Room Number *
              </label>
              <Input
                name="roomNumber"
                defaultValue={form?.roomNumber || ""}
                placeholder="e.g. 101 or Room-101"
                required
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Price per night (BDT) *
              </label>
              <Input
                name="price"
                type="number"
                defaultValue={form?.price || ""}
                required
                className="bg-muted"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                Services (comma separated)
              </label>
              <Input
                name="services"
                defaultValue={form?.services?.join(", ") || ""}
                className="bg-muted"
              />
            </div>

            {/* ── Image picker ── */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                Room Images{" "}
                <span className="text-muted-foreground/60">(up to 10)</span>
              </label>

              {/* Existing images when editing */}
              {form !== "add" &&
                form?.images?.length > 0 &&
                previews.length === 0 && (
                  <div className="mb-2">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Current images (uploading new ones will replace these):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {form.images.map((img, i) => (
                        <img
                          key={i}
                          src={imgUrl(img)}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover border border-border"
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* Drop zone / click to browse */}
              <label
                htmlFor="room-images-input"
                className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-5 text-center hover:border-primary/60 hover:bg-muted/60 transition-colors"
              >
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Click to select images
                </span>
                <span className="text-xs text-muted-foreground">
                  Hold{" "}
                  <kbd className="rounded border border-border bg-background px-1">
                    Ctrl
                  </kbd>{" "}
                  /{" "}
                  <kbd className="rounded border border-border bg-background px-1">
                    ⌘
                  </kbd>{" "}
                  to pick multiple
                </span>
              </label>
              <input
                id="room-images-input"
                ref={fileInputRef}
                type="file"
                name="images"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesChange}
              />

              {/* Previews of newly selected files */}
              {previews.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={src}
                        alt=""
                        className="h-20 w-20 rounded-xl object-cover border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {previews.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {previews.length} image{previews.length !== 1 ? "s" : ""}{" "}
                  selected
                </p>
              )}
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <Button
                type="submit"
                className="bg-gradient-primary text-primary-foreground"
              >
                {form === "add" ? "Add Room" : "Update Room"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openForm(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No rooms yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Room #
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Price/night
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Services
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => {
                const today = new Date();
                const activeBlocks = (r.blockedDates || []).filter(
                  (b) => new Date(b.checkOut) >= today,
                );
                return (
                  <Fragment key={r._id}>
                    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">
                        {r.roomNumber}
                      </td>
                      <td className="px-5 py-3 font-medium text-primary">
                        ৳{r.price?.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {r.services?.join(", ") || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.isAvailable ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                          >
                            {r.isAvailable ? "Available" : "Unavailable"}
                          </span>
                          {activeBlocks.length > 0 && (
                            <span className="rounded-full bg-warning/10 text-warning px-2.5 py-1 text-xs font-medium">
                              {activeBlocks.length} block
                              {activeBlocks.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            title="Toggle availability"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                            onClick={() => handleToggle(r._id)}
                          >
                            {r.isAvailable ? (
                              <ToggleRight className="h-4 w-4 text-success" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            title="Manage booked dates"
                            className={`rounded-lg p-1.5 transition-colors ${blockPanel === r._id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
                            onClick={() => openBlockPanel(r._id)}
                          >
                            <CalendarRange className="h-4 w-4" />
                          </button>
                          <button
                            title="Edit"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                            onClick={() => openForm(r)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            title="Delete"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => handleDelete(r._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {blockPanel === r._id && (
                      <tr key={`${r._id}-blocks`} className="bg-muted/20">
                        <td colSpan={5} className="px-6 py-4">
                          <p className="mb-3 text-xs font-semibold text-foreground uppercase tracking-wide">
                            Booked / Blocked Dates — Room {r.roomNumber}
                          </p>

                          {/* Existing blocks */}
                          {(r.blockedDates || []).length === 0 ? (
                            <p className="mb-3 text-xs text-muted-foreground">
                              No blocked dates yet.
                            </p>
                          ) : (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {r.blockedDates.map((b) => (
                                <div
                                  key={b._id}
                                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
                                >
                                  <CalendarRange className="h-3 w-3 text-warning" />
                                  <span className="text-foreground font-medium">
                                    {new Date(b.checkIn).toLocaleDateString()} →{" "}
                                    {new Date(b.checkOut).toLocaleDateString()}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleRemoveBlock(r._id, b._id)
                                    }
                                    className="ml-1 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Remove block"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add new block */}
                          <div className="flex flex-wrap items-end gap-2">
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">
                                Check-in
                              </label>
                              <Input
                                type="date"
                                value={blockForm.checkIn}
                                min={new Date().toISOString().split("T")[0]}
                                onChange={(e) =>
                                  setBlockForm((f) => ({
                                    ...f,
                                    checkIn: e.target.value,
                                  }))
                                }
                                className="bg-muted h-8 text-xs w-36"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">
                                Check-out
                              </label>
                              <Input
                                type="date"
                                value={blockForm.checkOut}
                                min={
                                  blockForm.checkIn ||
                                  new Date().toISOString().split("T")[0]
                                }
                                onChange={(e) =>
                                  setBlockForm((f) => ({
                                    ...f,
                                    checkOut: e.target.value,
                                  }))
                                }
                                className="bg-muted h-8 text-xs w-36"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="h-8 bg-gradient-primary text-primary-foreground"
                              onClick={() => handleAddBlock(r._id)}
                            >
                              Add Block
                            </Button>
                          </div>
                          {blockError && (
                            <p className="mt-1.5 text-xs text-destructive">
                              {blockError}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── CARS ────────────────────────────────────────────────────────────────────
const CarsView = () => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [bookingPanel, setBookingPanel] = useState(null);
  const [carBookings, setCarBookings] = useState({});
  const [bookingLoading, setBookingLoading] = useState(null);
  const [carRefundForm, setCarRefundForm] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get("/api/admin/cars")
      .then(setCars)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      form === "add"
        ? await api.postForm("/api/admin/cars", fd)
        : await api.putForm(`/api/admin/cars/${form._id}`, fd);
      setForm(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this car?")) return;
    try {
      await api.delete(`/api/admin/cars/${id}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/api/admin/cars/${id}/toggle`, {});
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const loadCarBookings = async (carId) => {
    setBookingLoading(carId);
    try {
      const data = await api.get(`/api/admin/cars/${carId}/bookings`);
      setCarBookings((prev) => ({ ...prev, [carId]: data }));
    } catch {}
    setBookingLoading(null);
  };

  const toggleBookingPanel = async (carId) => {
    if (bookingPanel === carId) {
      setBookingPanel(null);
      return;
    }
    setBookingPanel(carId);
    setCarRefundForm(null);
    await loadCarBookings(carId);
  };

  const handleCancelCarBooking = async (bookingId, carId) => {
    if (!confirm("Cancel this booking and initiate refund?")) return;
    try {
      await api.post(`/api/admin/bookings/${bookingId}/cancel`, {});
      await loadCarBookings(carId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCarRefund = async (e, carId) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.postForm(`/api/admin/bookings/${carRefundForm._id}/refund`, fd);
      setCarRefundForm(null);
      await loadCarBookings(carId);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-foreground">Cars</h2>
        <Button
          className="gap-2 bg-gradient-primary text-primary-foreground"
          onClick={() => setForm("add")}
        >
          <Plus className="h-4 w-4" /> Add Car
        </Button>
      </div>

      {form && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-heading font-bold text-foreground">
            {form === "add" ? "Add New Car" : `Edit: ${form.name}`}
          </h3>
          <form
            onSubmit={handleSubmit}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Car Name *
              </label>
              <Input
                name="name"
                defaultValue={form?.name || ""}
                required
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Type
              </label>
              <Input
                name="type"
                defaultValue={form?.type || "Sedan"}
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Seats
              </label>
              <Input
                name="seats"
                type="number"
                defaultValue={form?.seats || 5}
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Transmission
              </label>
              <Input
                name="transmission"
                defaultValue={form?.transmission || "Automatic"}
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Fuel
              </label>
              <Input
                name="fuel"
                defaultValue={form?.fuel || "Petrol"}
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Price per day (BDT) *
              </label>
              <Input
                name="price"
                type="number"
                defaultValue={form?.price || ""}
                required
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Quantity *
              </label>
              <Input
                name="quantity"
                type="number"
                defaultValue={form?.quantity || 1}
                required
                className="bg-muted"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-xs text-muted-foreground">
                Available Places (comma separated)
              </label>
              <Input
                name="places"
                defaultValue={form?.places?.join(", ") || ""}
                placeholder="e.g. Dhaka, Chittagong, Sylhet"
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Images
              </label>
              <input
                type="file"
                name="images"
                accept="image/*"
                multiple
                className="text-sm text-muted-foreground"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <Button
                type="submit"
                className="bg-gradient-primary text-primary-foreground"
              >
                {form === "add" ? "Add Car" : "Update Car"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : cars.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          No cars yet. Add one above.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Car
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Seats
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Price/day
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Qty
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {cars.map((c) => (
                <Fragment key={c._id}>
                  <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {c.images?.[0] && (
                          <img
                            src={imgUrl(c.images[0])}
                            alt=""
                            className="h-8 w-12 rounded object-cover"
                          />
                        )}
                        <span className="font-medium text-foreground">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {c.type}
                    </td>
                    <td className="px-5 py-3 text-foreground">{c.seats}</td>
                    <td className="px-5 py-3 font-medium text-primary">
                      ৳{c.price?.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-foreground">{c.quantity}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.isAvailable ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                      >
                        {c.isAvailable ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          title="View bookings"
                          className={`rounded-lg p-1.5 transition-colors ${
                            bookingPanel === c._id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent"
                          }`}
                          onClick={() => toggleBookingPanel(c._id)}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                        <button
                          title="Toggle"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                          onClick={() => handleToggle(c._id)}
                        >
                          {c.isAvailable ? (
                            <ToggleRight className="h-4 w-4 text-success" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          title="Edit"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                          onClick={() => setForm(c)}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          title="Delete"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => handleDelete(c._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {bookingPanel === c._id && (
                    <tr className="bg-muted/20">
                      <td colSpan={7} className="px-6 py-4">
                        <p className="mb-3 text-xs font-semibold text-foreground uppercase tracking-wide">
                          Bookings — {c.name}
                        </p>

                        {/* Refund confirmation form */}
                        {carRefundForm && (
                          <div className="mb-4 rounded-xl border border-border bg-card p-4">
                            <p className="mb-3 text-xs font-semibold text-foreground uppercase tracking-wide">
                              Confirm Refund — {carRefundForm._id.slice(-8)}
                            </p>
                            <form
                              onSubmit={(e) => handleCarRefund(e, c._id)}
                              className="grid gap-3 sm:grid-cols-2"
                            >
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">
                                  Transaction ID *
                                </label>
                                <Input
                                  name="transactionId"
                                  required
                                  className="bg-muted"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">
                                  Payment Method *
                                </label>
                                <Input
                                  name="paymentMethod"
                                  placeholder="e.g. bKash, Bank Transfer"
                                  required
                                  className="bg-muted"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-muted-foreground">
                                  Screenshot (optional)
                                </label>
                                <input
                                  type="file"
                                  name="screenshot"
                                  accept="image/*"
                                  className="text-sm text-muted-foreground"
                                />
                              </div>
                              <div className="sm:col-span-2 flex gap-2">
                                <Button
                                  type="submit"
                                  className="bg-gradient-primary text-primary-foreground"
                                >
                                  Confirm Refund
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setCarRefundForm(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </div>
                        )}

                        {bookingLoading === c._id ? (
                          <p className="text-xs text-muted-foreground">
                            Loading...
                          </p>
                        ) : !carBookings[c._id]?.length ? (
                          <p className="text-xs text-muted-foreground">
                            No bookings yet.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="pb-2 text-left font-medium text-muted-foreground">
                                    User
                                  </th>
                                  <th className="pb-2 text-left font-medium text-muted-foreground">
                                    Pickup → Return
                                  </th>
                                  <th className="pb-2 text-left font-medium text-muted-foreground">
                                    Location
                                  </th>
                                  <th className="pb-2 text-left font-medium text-muted-foreground">
                                    Transaction ID
                                  </th>
                                  <th className="pb-2 text-left font-medium text-muted-foreground">
                                    Amount
                                  </th>
                                  <th className="pb-2 text-left font-medium text-muted-foreground">
                                    Status
                                  </th>
                                  <th className="pb-2 text-left font-medium text-muted-foreground">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {carBookings[c._id].map((b) => (
                                  <tr
                                    key={b._id}
                                    className="border-b border-border last:border-0"
                                  >
                                    <td className="py-2 pr-4">
                                      <div className="font-medium text-foreground">
                                        {b.userName || "—"}
                                      </div>
                                      <div className="text-muted-foreground">
                                        {b.userEmail || ""}
                                      </div>
                                    </td>
                                    <td className="py-2 pr-4 text-muted-foreground">
                                      {b.pickupDate
                                        ? new Date(
                                            b.pickupDate,
                                          ).toLocaleDateString()
                                        : "—"}
                                      {b.returnDate
                                        ? " → " +
                                          new Date(
                                            b.returnDate,
                                          ).toLocaleDateString()
                                        : ""}
                                      {b.days && (
                                        <span className="ml-1 text-muted-foreground/70">
                                          ({b.days}d)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-4 text-muted-foreground">
                                      {b.pickupLocation || "—"}
                                    </td>
                                    <td
                                      className="py-2 pr-4 font-mono text-xs text-muted-foreground"
                                      title={b.transactionId}
                                    >
                                      {b.transactionId
                                        ? b.transactionId.slice(-8)
                                        : "—"}
                                    </td>
                                    <td className="py-2 pr-4 font-medium text-foreground">
                                      ৳{b.totalAmount?.toLocaleString()}
                                    </td>
                                    <td className="py-2 pr-4">
                                      <span
                                        className={`rounded-full px-2 py-0.5 font-medium ${
                                          STATUS_COLORS[b.status] ||
                                          "bg-muted text-muted-foreground"
                                        }`}
                                      >
                                        {b.status}
                                      </span>
                                      {b.refundStatus && (
                                        <span
                                          className={`ml-1 rounded-full px-2 py-0.5 font-medium ${
                                            b.refundStatus === "completed"
                                              ? "bg-success/10 text-success"
                                              : "bg-warning/10 text-warning"
                                          }`}
                                        >
                                          {b.refundStatus === "completed"
                                            ? "refunded"
                                            : b.refundStatus}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2">
                                      <div className="flex gap-1">
                                        {b.status !== "cancelled" && (
                                          <button
                                            title="Cancel booking"
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                            onClick={() =>
                                              handleCancelCarBooking(
                                                b._id,
                                                c._id,
                                              )
                                            }
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                        {b.refundStatus === "in_progress" && (
                                          <button
                                            title="Process refund"
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-success/10 hover:text-success transition-colors"
                                            onClick={() => setCarRefundForm(b)}
                                          >
                                            <Check className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── BOOKINGS ────────────────────────────────────────────────────────────────
const BookingsView = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundForm, setRefundForm] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newCheckIn, setNewCheckIn] = useState("");
  const [newCheckOut, setNewCheckOut] = useState("");
  const [newPickupDate, setNewPickupDate] = useState("");
  const [newReturnDate, setNewReturnDate] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [viewMode, setViewMode] = useState("upcoming"); // "upcoming" (default: today+future), "past", "all"

  const load = () => {
    setLoading(true);
    // Build query params
    const params = new URLSearchParams({ limit: 100, viewMode });

    api
      .get(`/api/admin/bookings?${params.toString()}`)
      .then((data) => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [viewMode]);

  const handleCancel = async (id) => {
    if (!confirm("Cancel this booking and initiate refund?")) return;
    try {
      await api.post(`/api/admin/bookings/${id}/cancel`, {});
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.postForm(`/api/admin/bookings/${refundForm._id}/refund`, fd);
      setRefundForm(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApproveCoinTopup = async (id) => {
    if (!confirm("Approve this coin top-up?")) return;
    try {
      await api.post(`/api/admin/coin-topups/${id}/approve`, {});
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRejectCoinTopup = async (id) => {
    const reason = prompt("Reason for rejection:");
    if (!reason) return;
    try {
      await api.post(`/api/admin/coin-topups/${id}/reject`, { reason });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRefundCoinPaidBooking = async (id, amount) => {
    const reason = prompt(
      `Refund ${amount} coins for this booking? Enter reason:`,
    );
    if (!reason) return;
    try {
      await api.post(`/api/admin/bookings/${id}/refund-coins`, { reason });
      alert("Booking refunded! Coins returned to user.");
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleModal) return;

    const payload = {
      type: rescheduleModal.type,
    };

    if (rescheduleModal.type === "hotel") {
      if (!newCheckIn || !newCheckOut) {
        alert("Please enter both check-in and check-out dates");
        return;
      }
      payload.checkIn = newCheckIn;
      payload.checkOut = newCheckOut;
    } else if (rescheduleModal.type === "car") {
      if (!newPickupDate || !newReturnDate) {
        alert("Please enter both pickup and return dates");
        return;
      }
      payload.pickupDate = newPickupDate;
      payload.returnDate = newReturnDate;
    }

    setRescheduling(true);
    try {
      await api.patch(
        `/api/admin/bookings/${rescheduleModal._id}/reschedule`,
        payload,
      );
      alert("Booking rescheduled successfully!");
      setRescheduleModal(null);
      setNewCheckIn("");
      setNewCheckOut("");
      setNewPickupDate("");
      setNewReturnDate("");
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setRescheduling(false);
    }
  };

  // Helper function to format date as dd/mm/yyyy
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      b.userName?.toLowerCase().includes(q) ||
      b.userEmail?.toLowerCase().includes(q) ||
      b.carName?.toLowerCase().includes(q) ||
      b.hotelName?.toLowerCase().includes(q) ||
      b.transactionId?.toLowerCase().includes(q) ||
      (b.type === "coin_topup" && "coin topup".includes(q)) ||
      formatDate(b.createdAt).includes(q);

    // For coin_topup, don't filter by date since they don't have startDate
    if (b.type === "coin_topup") {
      return matchesSearch;
    }

    const startDate = b.pickupDate || b.checkIn;
    const endDate = b.returnDate || b.checkOut;

    let matchesDate = !dateFilter;
    if (dateFilter && startDate && endDate) {
      // Check if the selected date is within the booking range (check-in inclusive, check-out exclusive)
      const selectedDate = new Date(dateFilter);
      const bookingStart = new Date(startDate);
      const bookingEnd = new Date(endDate);
      matchesDate = selectedDate >= bookingStart && selectedDate < bookingEnd;
    }
    return matchesSearch && matchesDate;
  });

  return (
    <div>
      <h2 className="mb-4 font-heading text-lg font-bold text-foreground">
        Bookings
      </h2>

      {/* View Mode Tabs */}
      <div className="mb-5 flex gap-2 border-b border-border">
        <button
          onClick={() => setViewMode("upcoming")}
          className={`px-3 py-2 font-medium transition-colors ${
            viewMode === "upcoming"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Today & Future
        </button>
        <button
          onClick={() => setViewMode("past")}
          className={`px-3 py-2 font-medium transition-colors ${
            viewMode === "past"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Past Bookings
        </button>
        <button
          onClick={() => setViewMode("all")}
          className={`px-3 py-2 font-medium transition-colors ${
            viewMode === "all"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Bookings
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          placeholder="Search by user name, car/hotel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-muted w-64"
        />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-muted w-44"
          title="Filter by date - shows all bookings that overlap with this date"
        />
        {(search || dateFilter) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setDateFilter("");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {rescheduleModal && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-heading font-bold text-foreground">
            Reschedule Booking — {rescheduleModal._id.slice(-8)}
          </h3>
          <form
            onSubmit={handleRescheduleSubmit}
            className="grid gap-3 sm:grid-cols-2"
          >
            {rescheduleModal.type === "hotel" ? (
              <>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    New Check-in *
                  </label>
                  <input
                    type="date"
                    value={newCheckIn}
                    onChange={(e) => setNewCheckIn(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    New Check-out *
                  </label>
                  <input
                    type="date"
                    value={newCheckOut}
                    onChange={(e) => setNewCheckOut(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    New Pickup Date *
                  </label>
                  <input
                    type="date"
                    value={newPickupDate}
                    onChange={(e) => setNewPickupDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    New Return Date *
                  </label>
                  <input
                    type="date"
                    value={newReturnDate}
                    onChange={(e) => setNewReturnDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </>
            )}
            <div className="sm:col-span-2 flex gap-2">
              <Button
                type="submit"
                disabled={rescheduling}
                className="bg-gradient-primary text-primary-foreground"
              >
                {rescheduling ? "Rescheduling..." : "Confirm Reschedule"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRescheduleModal(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {refundForm && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 font-heading font-bold text-foreground">
            Confirm Refund — {refundForm._id.slice(-8)}
          </h3>
          <form onSubmit={handleRefund} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Transaction ID *
              </label>
              <Input name="transactionId" required className="bg-muted" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Payment Method *
              </label>
              <Input
                name="paymentMethod"
                placeholder="e.g. bKash, Bank Transfer"
                required
                className="bg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Screenshot (optional)
              </label>
              <input
                type="file"
                name="screenshot"
                accept="image/*"
                className="text-sm text-muted-foreground"
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button
                type="submit"
                className="bg-gradient-primary text-primary-foreground"
              >
                Confirm Refund
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefundForm(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          {bookings.length === 0
            ? "No upcoming bookings."
            : "No bookings match your search."}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Booking
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Transaction ID
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Dates
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const startDate = b.pickupDate || b.checkIn;
                const endDate = b.returnDate || b.checkOut;
                const isToday =
                  startDate &&
                  new Date(startDate).toDateString() ===
                    new Date().toDateString();
                return (
                  <>
                    <tr
                      key={b._id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() =>
                        setExpanded(expanded === b._id ? null : b._id)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {b.userName || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.userEmail || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="capitalize text-foreground font-medium">
                          {b.type === "coin_topup"
                            ? `Coin Top-up`
                            : b.type === "car"
                              ? b.carName
                              : b.hotelName || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {b.type === "coin_topup" ? "wallet" : b.type}
                          {isToday && b.type !== "coin_topup" && (
                            <span className="ml-2 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                              Today
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs text-muted-foreground"
                        title={b.transactionId}
                      >
                        {b.transactionId ? b.transactionId.slice(-12) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {b.type === "coin_topup"
                          ? formatDate(b.createdAt)
                          : startDate
                            ? formatDate(startDate)
                            : "—"}
                        {endDate && b.type !== "coin_topup"
                          ? " → " + formatDate(endDate)
                          : ""}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        ৳{b.totalAmount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[b.status] || "bg-muted text-muted-foreground"}`}
                        >
                          {b.status}
                        </span>
                        {b.refundStatus && (
                          <span
                            className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${b.refundStatus === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}
                          >
                            {b.refundStatus === "completed"
                              ? "refunded"
                              : b.refundStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {b.type !== "coin_topup" &&
                            b.status !== "cancelled" &&
                            viewMode === "upcoming" && (
                              <button
                                title="Reschedule booking"
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-info/10 hover:text-info transition-colors"
                                onClick={() => {
                                  setRescheduleModal({
                                    _id: b._id,
                                    type: b.type,
                                    currentStartDate: b.pickupDate || b.checkIn,
                                    currentEndDate: b.returnDate || b.checkOut,
                                  });
                                  setNewCheckIn(b.checkIn || "");
                                  setNewCheckOut(b.checkOut || "");
                                  setNewPickupDate(b.pickupDate || "");
                                  setNewReturnDate(b.returnDate || "");
                                }}
                              >
                                <Calendar className="h-4 w-4" />
                              </button>
                            )}
                          {b.type !== "coin_topup" &&
                            b.status !== "cancelled" && (
                              <button
                                title="Cancel booking"
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                onClick={() => handleCancel(b._id)}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          {b.type !== "coin_topup" &&
                            b.paidWithCoins === true &&
                            b.status !== "refunded" && (
                              <button
                                title="Refund coins to user"
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-warning/10 hover:text-warning transition-colors"
                                onClick={() =>
                                  handleRefundCoinPaidBooking(
                                    b._id,
                                    b.totalAmount,
                                  )
                                }
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          {b.type !== "coin_topup" &&
                            b.refundStatus === "in_progress" && (
                              <button
                                title="Process refund"
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-success/10 hover:text-success transition-colors"
                                onClick={() => setRefundForm(b)}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                          {b.type === "coin_topup" &&
                            b.paymentMethod === "ssl_commerz" &&
                            b.status === "approved" && (
                              <span className="px-2 py-1 text-xs text-success font-medium">
                                Auto-approved
                              </span>
                            )}
                          {b.type === "coin_topup" &&
                            b.paymentMethod !== "ssl_commerz" && (
                              <>
                                <span
                                  className={`px-2 py-1 text-xs font-medium ${
                                    b.status === "approved"
                                      ? "text-success bg-success/10"
                                      : b.status === "rejected"
                                        ? "text-destructive bg-destructive/10"
                                        : "text-warning bg-warning/10"
                                  }`}
                                >
                                  {b.status}
                                </span>
                                {b.status === "pending" && (
                                  <>
                                    <button
                                      title="Approve top-up"
                                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-success/10 hover:text-success transition-colors"
                                      onClick={() =>
                                        handleApproveCoinTopup(b._id)
                                      }
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      title="Reject top-up"
                                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                      onClick={() =>
                                        handleRejectCoinTopup(b._id)
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                    {expanded === b._id && (
                      <tr key={`${b._id}-detail`} className="bg-muted/20">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                            <div>
                              <span className="text-muted-foreground text-xs">
                                Booking ID
                              </span>
                              <p className="font-mono text-foreground">
                                {b._id}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">
                                User
                              </span>
                              <p className="font-medium text-foreground">
                                {b.userName} {b.userEmail && `(${b.userEmail})`}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">
                                {b.type === "coin_topup"
                                  ? "Top-up Type"
                                  : b.type === "car"
                                    ? "Car"
                                    : "Hotel / Room"}
                              </span>
                              <p className="font-medium text-foreground">
                                {b.type === "coin_topup"
                                  ? "Wallet Coin Top-up"
                                  : b.type === "car"
                                    ? b.carName
                                    : `${b.hotelName || ""}${b.roomNumber ? " · Room " + b.roomNumber : ""}`}
                              </p>
                            </div>
                            {b.type === "car" && b.pickupLocation && (
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Pickup Location
                                </span>
                                <p className="text-foreground">
                                  {b.pickupLocation}
                                </p>
                              </div>
                            )}
                            {b.contactNumber && (
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  Contact Number
                                </span>
                                <p className="text-foreground">
                                  {b.contactNumber}
                                </p>
                              </div>
                            )}
                            {b.type !== "coin_topup" && (
                              <div>
                                <span className="text-muted-foreground text-xs">
                                  {b.type === "car"
                                    ? "Pickup → Return"
                                    : "Check-in → Check-out"}
                                </span>
                                <p className="text-foreground">
                                  {startDate
                                    ? new Date(startDate).toLocaleDateString()
                                    : "—"}
                                  {endDate
                                    ? " → " +
                                      new Date(endDate).toLocaleDateString()
                                    : ""}
                                  {(b.days || b.nights) &&
                                    ` (${b.days || b.nights} ${b.type === "car" ? "day" : "night"}${(b.days || b.nights) > 1 ? "s" : ""})`}
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground text-xs">
                                Payment
                              </span>
                              <p className="text-foreground">
                                {b.paymentMethod || "—"} — ৳
                                {b.totalAmount?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">
                                Transaction ID
                              </span>
                              <p className="font-mono text-foreground text-xs break-all">
                                {b.transactionId || "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">
                                {b.type === "coin_topup"
                                  ? "Top-up Date"
                                  : "Booked On"}
                              </span>
                              <p className="text-foreground">
                                {new Date(b.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── USERS ───────────────────────────────────────────────────────────────────
const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/admin/users")
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="mb-4 font-heading text-lg font-bold text-foreground">
        Users
      </h2>
      {loading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Email
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Hotel
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    No users yet
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u._id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">
                      {u.name}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {u.email}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.role === "admin" ? "bg-primary/10 text-primary" : u.role === "hotel_staff" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {u.hotelName || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── STAFF ───────────────────────────────────────────────────────────────────
const StaffView = () => {
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [form, setForm] = useState({
    staffName: "",
    email: "",
    password: "",
    hotelId: "",
  });

  useEffect(() => {
    api
      .get("/api/admin/hotels")
      .then((data) =>
        setHotels([...data].sort((a, b) => a.name.localeCompare(b.name))),
      )
      .catch(() => {})
      .finally(() => setHotelsLoading(false));
  }, []);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.hotelId) {
      setError("Please select a hotel");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/admin/staff", {
        staffName: form.staffName,
        email: form.email,
        password: form.password,
        hotelId: form.hotelId,
      });
      setSuccess("Staff account created successfully!");
      setForm({ staffName: "", email: "", password: "", hotelId: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedHotel = hotels.find((h) => h._id === form.hotelId);

  return (
    <div className="max-w-lg">
      <h2 className="mb-4 font-heading text-lg font-bold text-foreground">
        Add Hotel Staff
      </h2>
      {success && (
        <div className="mb-4 rounded-lg bg-success/10 p-3 text-sm text-success">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Staff Name *
            </label>
            <Input
              value={form.staffName}
              onChange={handleChange("staffName")}
              required
              className="bg-muted"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Email *
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              required
              className="bg-muted"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Password *
            </label>
            <Input
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              required
              minLength={6}
              className="bg-muted"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Assign Hotel *
            </label>
            {hotelsLoading ? (
              <p className="text-xs text-muted-foreground">Loading hotels...</p>
            ) : hotels.length === 0 ? (
              <p className="text-xs text-destructive">
                No hotels found. Add a hotel first.
              </p>
            ) : (
              <select
                value={form.hotelId}
                onChange={handleChange("hotelId")}
                required
                className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— Select a hotel —</option>
                {hotels.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}
            {/* Preview selected hotel image */}
            {selectedHotel?.image && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={imgUrl(selectedHotel.image)}
                  alt={selectedHotel.name}
                  className="h-12 w-16 rounded-lg object-cover border border-border"
                />
                <span className="text-xs text-muted-foreground">
                  {selectedHotel.area || ""}
                </span>
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading || hotelsLoading || hotels.length === 0}
            className="w-full bg-gradient-primary text-primary-foreground"
          >
            {loading ? "Creating..." : "Create Staff Account"}
          </Button>
        </form>
      </div>
    </div>
  );
};

// ─── MANUAL PAYMENTS VIEW ───────────────────────────────────────────────────

const ManualPaymentsView = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/api/admin/manual-payments?status=${filter}`,
      );
      setPayments(response || []);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (paymentId) => {
    try {
      await api.post(`/api/admin/manual-payments/${paymentId}/confirm`);
      toast({ title: "Payment confirmed", duration: 2000 });
      fetchPayments();
      setSelected(null);
    } catch (err) {
      console.error("Failed to confirm:", err);
    }
  };

  const handleReject = async (paymentId) => {
    if (!rejectReason.trim()) {
      alert("Please enter a rejection reason");
      return;
    }
    try {
      await api.post(`/api/admin/manual-payments/${paymentId}/reject`, {
        reason: rejectReason,
      });
      alert("Payment rejected");
      fetchPayments();
      setSelected(null);
      setRejectReason("");
    } catch (err) {
      console.error("Failed to reject:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-6">
        {["pending", "approved", "rejected"].map((status) => (
          <Button
            key={status}
            onClick={() => setFilter(status)}
            variant={filter === status ? "default" : "outline"}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : payments.length === 0 ? (
          <p className="text-muted-foreground">No {filter} payments</p>
        ) : (
          payments.map((payment) => (
            <div
              key={payment._id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="font-semibold">{payment.userName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold">
                    ৳{payment.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="font-semibold capitalize">
                    {payment.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Transaction ID
                  </p>
                  <p className="font-mono text-sm">{payment.transactionId}</p>
                </div>
              </div>

              {payment.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setSelected(payment._id)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" /> Review
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="font-semibold">Review Payment</h3>
            <img
              src={payments.find((p) => p._id === selected)?.screenshot}
              alt="Payment proof"
              className="w-full rounded-lg max-h-80 object-cover"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleConfirm(selected)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Confirm
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setRejectReason("");
                  // Show rejection form
                }}
              >
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
            {/* Rejection Reason Input */}
            <div>
              <Input
                placeholder="Rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-sm"
              />
              {rejectReason && (
                <Button
                  onClick={() => handleReject(selected)}
                  variant="destructive"
                  className="w-full mt-2"
                >
                  Submit Rejection
                </Button>
              )}
            </div>
            <Button
              onClick={() => {
                setSelected(null);
                setRejectReason("");
              }}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── COIN TOPUPS VIEW ───────────────────────────────────────────────────

const CoinTopupsView = () => {
  const [topups, setTopups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchTopups();
  }, [filter]);

  const fetchTopups = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/coin-topups?status=${filter}`);
      setTopups(response || []);
    } catch (err) {
      console.error("Failed to fetch topups:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (topupId) => {
    try {
      await api.post(`/api/admin/coin-topups/${topupId}/confirm`);
      alert("Coin top-up approved!");
      fetchTopups();
      setSelected(null);
    } catch (err) {
      console.error("Failed to confirm:", err);
    }
  };

  const handleReject = async (topupId) => {
    if (!rejectReason.trim()) {
      alert("Please enter a rejection reason");
      return;
    }
    try {
      await api.post(`/api/admin/coin-topups/${topupId}/reject`, {
        reason: rejectReason,
      });
      alert("Top-up rejected");
      fetchTopups();
      setSelected(null);
      setRejectReason("");
    } catch (err) {
      console.error("Failed to reject:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-6">
        {["pending", "approved", "rejected"].map((status) => (
          <Button
            key={status}
            onClick={() => setFilter(status)}
            variant={filter === status ? "default" : "outline"}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : topups.length === 0 ? (
          <p className="text-muted-foreground">No {filter} top-ups</p>
        ) : (
          topups.map((topup) => (
            <div
              key={topup._id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">User</p>
                  <p className="font-semibold">{topup.userName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-primary" />
                    <p className="font-semibold">{topup.amount}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="font-semibold capitalize">
                    {topup.paymentMethod}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold capitalize text-primary">
                    {topup.status}
                  </p>
                </div>
              </div>

              {topup.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  {topup.paymentMethod === "manual" && topup.screenshot && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelected(topup._id)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" /> View Proof
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleConfirm(topup._id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelected(topup._id);
                      setRejectReason("");
                    }}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Review/Reject Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="font-semibold">
              {rejectReason ? "Reject Top-up" : "Review Proof"}
            </h3>

            {!rejectReason &&
              topups.find((t) => t._id === selected)?.screenshot && (
                <img
                  src={topups.find((t) => t._id === selected)?.screenshot}
                  alt="Payment proof"
                  className="w-full rounded-lg max-h-80 object-cover"
                />
              )}

            {rejectReason ||
            !topups.find((t) => t._id === selected)?.screenshot ? (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Rejection Reason
                </label>
                <Input
                  type="text"
                  placeholder="Enter reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full"
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              {rejectReason ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selected)}
                    className="col-span-2"
                  >
                    Submit Rejection
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => handleConfirm(selected)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setRejectReason("Pending reason")}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>

            <Button
              onClick={() => {
                setSelected(null);
                setRejectReason("");
              }}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── COINS MANAGEMENT ─────────────────────────────────────────────────────────
const CoinsManagementView = () => {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) {
      setErrorMessage("Please enter an email");
      return;
    }

    setSearching(true);
    setErrorMessage("");
    try {
      const response = await api.get("/api/admin/search-user", {
        params: { email: searchEmail.trim() },
      });

      if (response.found) {
        setSelectedUser(response);
      } else {
        setErrorMessage("User not found");
        setSelectedUser(null);
      }
    } catch (err) {
      console.error("Search error:", err);
      const errorMsg = err.message || "Error searching user";
      setErrorMessage(errorMsg);
      setSelectedUser(null);
    } finally {
      setSearching(false);
    }
  };

  const handleAddCoins = async (e) => {
    e.preventDefault();

    if (!selectedUser?.user?.email || !amount || !reason) {
      setErrorMessage("All fields required");
      return;
    }

    if (parseInt(amount) <= 0) {
      setErrorMessage("Amount must be greater than 0");
      return;
    }

    if (!selectedUser.canReceiveCoins) {
      setErrorMessage(`Cannot add coins to ${selectedUser.user.role}`);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      const response = await api.post("/api/admin/add-coins", {
        email: selectedUser.user.email,
        amount: parseInt(amount),
        reason,
      });

      setSuccessMessage(
        `✓ Added ${amount} coins to ${response.data.user.name} (${response.data.user.email})`,
      );

      // Reset form
      setSearchEmail("");
      setSelectedUser(null);
      setAmount("");
      setReason("");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Error adding coins");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setAmount("");
    setReason("");
    setErrorMessage("");
  };

  return (
    <div>
      <h2 className="mb-6 font-heading text-lg font-bold text-foreground">
        Coins Management
      </h2>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card max-w-2xl">
        <h3 className="mb-6 font-heading font-bold text-foreground">
          Add Coins to User
        </h3>

        {successMessage && (
          <div className="mb-4 rounded-lg bg-success/10 p-3 text-sm text-success font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            {errorMessage}
          </div>
        )}

        {/* Step 1: Search User */}
        <div className="mb-6 pb-6 border-b border-border">
          <h4 className="mb-3 font-medium text-foreground">
            Step 1: Search User by Email
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder="Enter user email (e.g. john@example.com)"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="bg-muted flex-1"
              disabled={searching || !!selectedUser}
              onKeyPress={(e) => e.key === "Enter" && handleSearchUser()}
            />
            <Button
              onClick={handleSearchUser}
              disabled={searching || !searchEmail.trim() || !!selectedUser}
              className="bg-gradient-primary text-primary-foreground"
            >
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>

        {/* Step 2: User Selection */}
        {selectedUser && (
          <div className="mb-6 pb-6 border-b border-border">
            <h4 className="mb-3 font-medium text-foreground">
              Step 2: Selected User
            </h4>
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="font-medium">{selectedUser.user.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{selectedUser.user.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Role</p>
                  <p className="font-medium capitalize">
                    {selectedUser.user.role}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    Current Balance
                  </p>
                  <p className="font-medium flex items-center gap-1">
                    <Coins className="h-4 w-4" />
                    {selectedUser.currentBalance}
                  </p>
                </div>
              </div>

              {!selectedUser.canReceiveCoins && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Cannot add coins to {selectedUser.user.role} accounts
                </div>
              )}

              {selectedUser.canReceiveCoins && (
                <div className="rounded-lg bg-success/10 p-3 text-sm text-success font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  This user can receive coins
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleClearSelection}
                className="w-full"
              >
                Change User
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Add Coins Form */}
        {selectedUser && selectedUser.canReceiveCoins && (
          <div>
            <h4 className="mb-3 font-medium text-foreground">
              Step 3: Add Coins
            </h4>
            <form onSubmit={handleAddCoins} className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Amount (coins) *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-muted"
                  min="1"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Reason for Addition *
                </label>
                <Input
                  placeholder="e.g. Bonus, Reward, Compensation, Refund"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-muted"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !amount || !reason}
                className="bg-gradient-primary text-primary-foreground mt-2"
              >
                {loading ? "Adding Coins..." : "Add Coins"}
              </Button>
            </form>
          </div>
        )}

        {!selectedUser && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">How to use:</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>Enter a user's email address</li>
              <li>Click "Search" to find the user</li>
              <li>Review user details and coin balance</li>
              <li>Enter amount and reason, then add coins</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PAYMENT HISTORY VIEW ────────────────────────────────────────────────────

const PaymentHistoryView = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (email) params.append("email", email);
      if (date) params.append("dateFrom", date);
      if (paidBy) params.append("paidBy", paidBy);
      if (type) params.append("type", type);
      params.append("page", page);
      params.append("limit", limit);

      const response = await api.get(`/api/admin/payment-history?${params}`);
      setHistory(response.history || []);
    } catch (err) {
      alert("Error fetching history: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentHistory();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchPaymentHistory();
  };

  const handleReset = () => {
    setEmail("");
    setDate("");
    setPaidBy("");
    setType("");
    setPage(1);
  };

  const getPaidByBadge = (paidBy) => {
    const badges = {
      online: "bg-blue-100 text-blue-800",
      manual: "bg-amber-100 text-amber-800",
      coin: "bg-cyan-100 text-cyan-800",
    };
    return badges[paidBy] || "bg-gray-100 text-gray-800";
  };

  const getTypeBadge = (type) => {
    const badges = {
      payment: "bg-success/10 text-success",
      refund: "bg-warning/10 text-warning",
      coin_refund: "bg-warning/10 text-warning",
      admin_coin_add: "bg-info/10 text-info",
    };
    return badges[type] || "bg-gray-100 text-gray-800";
  };

  const getTypeLabel = (type) => {
    const labels = {
      payment: "Payment",
      refund: "Refund",
      coin_refund: "Coin Refund",
      admin_coin_add: "Admin Added",
    };
    return labels[type] || type;
  };

  return (
    <div>
      <h2 className="mb-6 font-heading text-lg font-bold text-foreground">
        Payment History
      </h2>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-heading font-bold text-foreground">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              placeholder="Search by email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-muted"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Paid By
            </label>
            <select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="online">Online (SSL Commerz)</option>
              <option value="manual">Manual Payment</option>
              <option value="coin">Coin</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="payment">Payment</option>
              <option value="refund">Refund</option>
              <option value="coin_refund">Coin Refund</option>
              <option value="admin_coin_add">Admin Added</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="bg-gradient-primary text-primary-foreground"
          >
            {loading ? "Searching..." : "Search"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card overflow-x-auto">
        <h3 className="mb-4 font-heading font-bold text-foreground">
          Results ({history.length || 0})
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No payment history found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Email
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Type
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Paid By
                </th>
                <th className="text-right py-3 px-4 font-semibold text-foreground">
                  Amount
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Item
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Transaction ID
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Date & Time
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {item.userName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.email}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTypeBadge(item.type)}`}
                    >
                      {getTypeLabel(item.type)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPaidByBadge(item.paidBy)}`}
                    >
                      {item.paidBy === "online"
                        ? "Online (SSL)"
                        : item.paidBy === "coin"
                          ? "Coin"
                          : "Manual"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-foreground">
                    {item.paidBy === "coin" ? (
                      <span className="flex items-center justify-end gap-1">
                        <Coins className="h-4 w-4" />
                        {item.amount}
                      </span>
                    ) : (
                      `$${item.amount.toFixed(2)}`
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {item.itemType}: {item.itemName}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                    {item.transactionId ? (
                      <span title={item.transactionId}>
                        {item.transactionId.substring(0, 16)}...
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-medium">{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {history.length > 0 && (
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center text-sm text-muted-foreground">
              Page {page}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={history.length < limit}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── TODAY'S BOOKINGS VIEW ───────────────────────────────────────────────────

const TodaysBookingsView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysBookings();
    const interval = setInterval(fetchTodaysBookings, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchTodaysBookings = async () => {
    try {
      const response = await api.get("/api/admin/todays-bookings");
      setData(response);
    } catch (err) {
      alert("Error fetching today's bookings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data)
    return <div className="text-muted-foreground">Loading...</div>;

  const summary = data?.summary || {};

  return (
    <div>
      <h2 className="mb-6 font-heading text-lg font-bold text-foreground">
        Today's Bookings & Blocks
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Hotel Check-ins</p>
          <p className="text-2xl font-bold text-foreground">
            {summary.hotelCheckIn || 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Hotel Check-outs</p>
          <p className="text-2xl font-bold text-foreground">
            {summary.hotelCheckOut || 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Car Pickups</p>
          <p className="text-2xl font-bold text-foreground">
            {summary.carPickup || 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Car Returns</p>
          <p className="text-2xl font-bold text-foreground">
            {summary.carReturn || 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Blocked Rooms</p>
          <p className="text-2xl font-bold text-foreground">
            {summary.blockedRooms || 0}
          </p>
        </div>
      </div>

      {/* Hotel Bookings */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-heading font-bold text-foreground">
          Hotel Bookings ({data?.hotelBookings?.length || 0})
        </h3>
        {data?.hotelBookings?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hotel bookings today
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Guest</th>
                  <th className="text-left py-3 px-4 font-semibold">Hotel</th>
                  <th className="text-left py-3 px-4 font-semibold">Room</th>
                  <th className="text-left py-3 px-4 font-semibold">
                    Check-in
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">
                    Check-out
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.hotelBookings &&
                  data.hotelBookings.length > 0 &&
                  data.hotelBookings.map((booking) => {
                    if (!booking || !booking.userInfo) return null;
                    return (
                      <tr
                        key={booking._id}
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">
                              {booking.userInfo?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.userInfo?.email || ""}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {booking.hotelInfo?.name || "Unknown"}
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">
                          #{booking.roomInfo?.roomNumber || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(booking.checkIn).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(booking.checkOut).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[booking.status] || "bg-gray-100"}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Car Bookings */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-heading font-bold text-foreground">
          Car Bookings ({data?.carBookings?.length || 0})
        </h3>
        {data?.carBookings?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No car bookings today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Guest</th>
                  <th className="text-left py-3 px-4 font-semibold">Car</th>
                  <th className="text-left py-3 px-4 font-semibold">
                    Pickup Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">
                    Return Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.carBookings &&
                  data.carBookings.length > 0 &&
                  data.carBookings.map((booking) => {
                    if (!booking || !booking.userInfo) return null;
                    return (
                      <tr
                        key={booking._id}
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">
                              {booking.userInfo?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.userInfo?.email || ""}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {booking.carInfo?.name || "Unknown"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(booking.pickupDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(booking.returnDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[booking.status] || "bg-gray-100"}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Blocked Dates */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-heading font-bold text-foreground">
          Admin-Blocked Dates ({data?.blockedDates?.length || 0})
        </h3>
        {data?.blockedDates?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocks today</p>
        ) : (
          <div className="space-y-2">
            {data?.blockedDates?.map((block) => (
              <div
                key={block.blockId}
                className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div>
                  <p className="font-medium">{block.hotelName}</p>
                  <p className="text-sm text-muted-foreground">
                    Room #{block.roomNumber} •{" "}
                    {new Date(block.checkIn).toLocaleDateString()} to{" "}
                    {new Date(block.checkOut).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
