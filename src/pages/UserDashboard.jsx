import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import WalletCard from "@/components/user/WalletCard";
import CoinTopupCard from "@/components/user/CoinTopupCard";
import BookingDetail from "@/components/booking/BookingDetail";
import {
  Hotel,
  Car,
  Coins,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Trash2,
  AlertCircle,
  BusFront,
  Package,
} from "lucide-react";

const statusBadge = (booking) => {
  if (booking.status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3 w-3" /> Confirmed
      </span>
    );
  }
  if (booking.status === "cancelled") {
    if (booking.refundStatus === "completed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <CheckCircle2 className="h-3 w-3" /> Refunded
        </span>
      );
    }
    if (booking.refundStatus === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">
          <RefreshCw className="h-3 w-3 animate-spin" /> Refund in Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
        <XCircle className="h-3 w-3" /> Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {booking.status}
    </span>
  );
};

const parseBookingDate = (value) => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

const canCancelBooking = (booking) => {
  if (booking.status !== "confirmed") return false;
  if (booking.cancelRequest) return false; // Block if ANY cancel request exists

  const checkInTime = parseBookingDate(
    booking.checkIn || booking.pickupDate || booking.travelDate,
  );
  const now = new Date();
  const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);

  return hoursUntilCheckIn > 24;
};

const getHoursUntilCheckIn = (booking) => {
  const checkInTime = parseBookingDate(
    booking.checkIn || booking.pickupDate || booking.travelDate,
  );
  const now = new Date();
  const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);
  return Math.max(0, Math.ceil(hoursUntilCheckIn - 24));
};

const BookingCard = ({ booking, onViewDetails }) => {
  const isHotel = booking.type === "hotel";
  const isBus = booking.type === "bus";
  const isPackage = booking.type === "package" || booking.type === "holiday";
  const dateStart = isBus
    ? booking.travelDate
    : isHotel
      ? booking.checkIn
      : isPackage
        ? booking.travelDate
        : booking.pickupDate;
  const dateEnd = isBus
    ? booking.travelDate
    : isHotel
      ? booking.checkOut
      : isPackage
        ? booking.travelDate
        : booking.returnDate;
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  const canCancel = canCancelBooking(booking);
  const hoursLeft = canCancel ? getHoursUntilCheckIn(booking) : 0;

  return (
    <div
      onClick={() => onViewDetails(booking._id)}
      className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-lg hover:border-primary/50 transition-all duration-300"
    >
      {isPackage && booking.packageDetails?.image && (
        <div className="mb-4 overflow-hidden rounded-3xl">
          <img
            src={imgUrl(booking.packageDetails.image)}
            alt={booking.packageName || "Holiday Package"}
            className="h-40 w-full object-cover"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-xl p-2.5 ${
              isHotel
                ? "bg-primary/10"
                : isBus
                  ? "bg-blue-100"
                  : isPackage
                    ? "bg-violet-100"
                    : "bg-secondary/10"
            }`}
          >
            {isHotel ? (
              <Hotel className="h-5 w-5 text-primary" />
            ) : isBus ? (
              <BusFront className="h-5 w-5 text-blue-600" />
            ) : isPackage ? (
              <Package className="h-5 w-5 text-violet-600" />
            ) : (
              <Car className="h-5 w-5 text-secondary" />
            )}
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">
              {isBus
                ? booking.busName || "Bus Booking"
                : isHotel
                  ? booking.hotelName || "Hotel Booking"
                  : isPackage
                    ? booking.packageName || "Holiday Package"
                    : booking.carName || "Car Rental"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isBus
                ? booking.acType || ""
                : isHotel
                  ? `Room ${booking.roomNumber || ""}`
                  : isPackage
                    ? `${booking.peopleCount || 1} people`
                    : booking.carType || ""}
            </p>
          </div>
        </div>
        {statusBadge(booking)}
      </div>

      <div
        className={`grid gap-3 text-sm mb-4 ${isBus ? "grid-cols-4" : "grid-cols-2"}`}
      >
        <div>
          <p className="text-xs text-muted-foreground">
            {isBus
              ? "Travel Date"
              : isHotel
                ? "Check-in"
                : isPackage
                  ? "Travel Date"
                  : "Pick-up"}
          </p>
          <p className="font-medium text-foreground">{fmt(dateStart)}</p>
        </div>
        {isBus && (
          <div>
            <p className="text-xs text-muted-foreground">Departure Time</p>
            <p className="font-medium text-foreground">
              {booking.departureTime || "-"}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">
            {isBus
              ? "Pickup Location"
              : isHotel
                ? "Check-out"
                : isPackage
                  ? "People"
                  : "Return"}
          </p>
          <p className="font-medium text-foreground">
            {isBus
              ? booking.pickupLocation || "-"
              : isPackage
                ? booking.peopleCount || 1
                : fmt(dateEnd)}
          </p>
        </div>
        {isPackage && (
          <div>
            <p className="text-xs text-muted-foreground">Per Person</p>
            <p className="font-medium text-foreground">
              ৳{(booking.pricePerPerson || 0).toLocaleString()}
            </p>
          </div>
        )}
        {!isBus && !isPackage && (
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="font-medium text-foreground">
              {`${booking.days} day${booking.days !== 1 ? "s" : ""}`}
            </p>
          </div>
        )}
        {!isBus && (
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-heading font-bold text-primary">
              ৳{(booking.totalAmount || 0).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {isBus && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="font-heading font-bold text-primary text-lg">
            ৳{(booking.totalAmount || 0).toLocaleString()}
          </p>
        </div>
      )}

      {/* Cancel Request Status */}
      {booking.cancelRequest?.status === "pending" && (
        <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-900">
            Cancellation request pending admin approval
          </p>
        </div>
      )}

      {/* Cancel Button - Show when conditions are met */}
      {canCancel && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs text-amber-900 mb-2">
            ⏰ You have <span className="font-semibold">{hoursLeft} hours</span>{" "}
            left to cancel before the 24-hour cutoff.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="w-full h-8"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(booking._id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Request Cancellation
          </Button>
        </div>
      )}

      {/* Refund Status */}
      {booking.status === "cancelled" && (
        <div
          className={`mt-3 rounded-lg p-3 text-sm ${
            booking.refundStatus === "completed"
              ? "bg-success/10 border border-success/20"
              : booking.refundStatus === "in_progress"
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-blue-50 border border-blue-200"
          }`}
        >
          <p className="text-xs text-muted-foreground mb-1">Refund Status</p>
          {booking.refundAmount && (
            <p className="text-xs font-semibold mb-2">
              Amount:{" "}
              <span className="text-primary">
                ৳{booking.refundAmount.toFixed(2)}
              </span>
            </p>
          )}
          {booking.refundStatus === "completed" ? (
            <p className="text-success flex items-center gap-1 text-xs font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Refund Completed
            </p>
          ) : booking.refundStatus === "in_progress" ? (
            <p className="text-yellow-700 flex items-center gap-1 text-xs">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Refund in Progress
            </p>
          ) : (
            <p className="text-blue-700 text-xs">
              Cancellation approved. Awaiting refund initiation.
            </p>
          )}
        </div>
      )}

      {/* Click to view details hint */}
      <div className="text-xs text-muted-foreground mt-3 pt-3 border-t group-hover:text-primary transition-colors">
        Click to view details and invoice
      </div>
    </div>
  );
};

const UserDashboard = () => {
  const { user, socket, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [busBookings, setBusBookings] = useState([]);
  const [pendingBusTickets, setPendingBusTickets] = useState([]);
  const [topupRequests, setTopupRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("active"); // "active" or "completed"
  const [tab, setTab] = useState("hotel");
  const [hotelPage, setHotelPage] = useState(1);
  const [carPage, setCarPage] = useState(1);
  const [busPage, setBusPage] = useState(1);
  const [packagePage, setPackagePage] = useState(1);
  const [topupPage, setTopupPage] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const ITEMS_PER_PAGE = 3;

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login");
      } else if (user.role === "hotel_staff") {
        navigate("/staff", { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    api
      .get("/api/bookings/my")
      .then((data) => {
        setBookings(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    api
      .get("/api/bookings/user/bus-bookings")
      .then((data) => {
        setBusBookings(data);
      })
      .catch(() => {});
    api
      .get("/api/bookings/user/bus-tickets/pending")
      .then((data) => {
        setPendingBusTickets(data);
      })
      .catch(() => {});
    api
      .get("/api/payment/my-coin-topups")
      .then((data) => {
        setTopupRequests(data);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleCancelled = ({ bookingId }) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, status: "cancelled", refundStatus: "in_progress" }
            : b,
        ),
      );
    };

    const handleRefunded = ({
      bookingId,
      transactionId,
      paymentMethod,
      refundScreenshot,
    }) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? {
                ...b,
                status: "cancelled",
                refundStatus: "completed",
                transactionId,
                paymentMethod,
                refundScreenshot,
              }
            : b,
        ),
      );
    };

    const handleCancelApproved = ({ bookingId }) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? {
                ...b,
                status: "cancelled",
                refundStatus: "in_progress",
                cancelRequest: { status: "approved" },
              }
            : b,
        ),
      );
    };

    const handleCancelRejected = ({ bookingId }) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, cancelRequest: { status: "rejected" } }
            : b,
        ),
      );
    };

    const handleNewCancelRequest = ({ bookingId, cancelRequest }) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, cancelRequest: { status: "pending" } }
            : b,
        ),
      );
    };

    socket.on("booking-cancelled", handleCancelled);
    socket.on("booking-refunded", handleRefunded);
    socket.on("cancel-approved", handleCancelApproved);
    socket.on("cancel-rejected", handleCancelRejected);
    socket.on("new-cancel-request", handleNewCancelRequest);

    return () => {
      socket.off("booking-cancelled", handleCancelled);
      socket.off("booking-refunded", handleRefunded);
      socket.off("cancel-approved", handleCancelApproved);
      socket.off("cancel-rejected", handleCancelRejected);
      socket.off("new-cancel-request", handleNewCancelRequest);
    };
  }, [socket]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center text-muted-foreground">
          Loading...
        </div>
        <Footer />
      </div>
    );
  }

  // Check if a booking is upcoming (not yet completed or cancelled)
  const isUpcoming = (booking) => {
    if (booking.status === "cancelled") return false;
    const endDate =
      booking.type === "hotel"
        ? booking.checkOut
        : booking.type === "package" || booking.type === "holiday"
          ? booking.travelDate
          : booking.returnDate;
    return new Date(endDate) > new Date();
  };

  // Check if a booking is completed or cancelled
  const isCompleted = (booking) => {
    if (booking.status === "cancelled") return true;
    const endDate =
      booking.type === "hotel"
        ? booking.checkOut
        : booking.type === "package" || booking.type === "holiday"
          ? booking.travelDate
          : booking.returnDate;
    return new Date(endDate) <= new Date();
  };

  // Check if a bus booking is upcoming
  const isBusUpcoming = (booking) => {
    if (booking.status !== "confirmed") return false; // Only show confirmed bookings
    return new Date(booking.travelDate) > new Date();
  };

  // Check if a bus booking is completed
  const isBusCompleted = (booking) => {
    if (booking.status === "cancelled" || booking.status === "rejected")
      return true;
    if (booking.status !== "confirmed") return false; // Only show confirmed bookings
    return new Date(booking.travelDate) <= new Date();
  };

  const upcomingBookings = bookings.filter(isUpcoming);
  const completedBookings = bookings.filter(isCompleted);

  const hotelBookings = bookings.filter(
    (b) => b.type === "hotel" && isUpcoming(b),
  );
  const packageBookings = bookings.filter(
    (b) => (b.type === "package" || b.type === "holiday") && isUpcoming(b),
  );
  const carBookings = bookings.filter(
    (b) => (b.type === "car" || b.type === "carrent") && isUpcoming(b),
  );
  const busBookingsUpcoming = busBookings.filter(isBusUpcoming);

  const completedHotelBookings = bookings.filter(
    (b) => b.type === "hotel" && isCompleted(b),
  );
  const completedPackageBookings = bookings.filter(
    (b) => (b.type === "package" || b.type === "holiday") && isCompleted(b),
  );
  const completedCarBookings = bookings.filter(
    (b) => (b.type === "car" || b.type === "carrent") && isCompleted(b),
  );
  const busBookingsCompleted = busBookings.filter(isBusCompleted);

  // Pagination
  const sourceBookings =
    section === "active"
      ? tab === "hotel"
        ? hotelBookings
        : tab === "package"
          ? packageBookings
          : tab === "car"
            ? carBookings
            : busBookingsUpcoming
      : tab === "hotel"
        ? completedHotelBookings
        : tab === "package"
          ? completedPackageBookings
          : tab === "car"
            ? completedCarBookings
            : busBookingsCompleted;

  const shown = sourceBookings;
  const totalPages = Math.ceil(shown.length / ITEMS_PER_PAGE);
  const currentPage =
    tab === "hotel"
      ? hotelPage
      : tab === "car"
        ? carPage
        : tab === "bus"
          ? busPage
          : packagePage;
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedShown = shown.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-primary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-primary-foreground">
            My Dashboard
          </h1>
          <p className="text-primary-foreground/80">
            Welcome back, {user?.name || "Traveler"}
          </p>
        </div>
      </div>

      <div className="container py-10">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            {
              label: "Hotel Bookings",
              value: hotelBookings.length,
              icon: <Hotel className="h-5 w-5" />,
              color: "text-primary",
            },
            {
              label: "Car Rentals",
              value: carBookings.length,
              icon: <Car className="h-5 w-5" />,
              color: "text-secondary",
            },
            {
              label: "Package Trips",
              value: packageBookings.length,
              icon: <Package className="h-5 w-5" />,
              color: "text-violet-500",
            },
            {
              label: "Bus Bookings",
              value: busBookingsUpcoming.length,
              icon: <BusFront className="h-5 w-5" />,
              color: "text-blue-500",
            },
            {
              label: "Confirmed",
              value: bookings.filter(
                (b) => b.status === "confirmed" && isUpcoming(b),
              ).length,
              icon: <CheckCircle2 className="h-5 w-5" />,
              color: "text-success",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className={`mb-2 ${s.color}`}>{s.icon}</div>
              <div className="font-heading text-2xl font-bold text-foreground">
                {s.value}
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Wallet Section */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <WalletCard balance={user?.walletBalance || 0} />
          </div>
          <div>
            <CoinTopupCard
              onTopupSuccess={() => {
                // Refresh topup requests list
                api
                  .get("/api/payment/my-coin-topups")
                  .then((data) => {
                    setTopupRequests(data);
                  })
                  .catch(() => {});
              }}
            />
          </div>
        </div>

        {/* Section Toggle - Active vs Completed */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={section === "active" ? "default" : "outline"}
            onClick={() => {
              setSection("active");
              setHotelPage(1);
              setCarPage(1);
              setBusPage(1);
              setPackagePage(1);
            }}
            className={
              section === "active"
                ? "bg-gradient-primary text-primary-foreground"
                : ""
            }
          >
            Active Bookings
          </Button>
          <Button
            variant={section === "completed" ? "default" : "outline"}
            onClick={() => {
              setSection("completed");
              setHotelPage(1);
              setCarPage(1);
              setBusPage(1);
              setPackagePage(1);
            }}
            className={
              section === "completed"
                ? "bg-gradient-primary text-primary-foreground"
                : ""
            }
          >
            Completed & Cancelled
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={tab === "hotel" ? "default" : "outline"}
            onClick={() => {
              setTab("hotel");
              setHotelPage(1);
            }}
            className={
              tab === "hotel"
                ? "bg-gradient-primary text-primary-foreground"
                : ""
            }
          >
            <Hotel className="h-4 w-4 mr-2" /> Hotel Bookings
          </Button>
          <Button
            variant={tab === "car" ? "default" : "outline"}
            onClick={() => {
              setTab("car");
              setCarPage(1);
            }}
            className={
              tab === "car" ? "bg-gradient-primary text-primary-foreground" : ""
            }
          >
            <Car className="h-4 w-4 mr-2" /> Car Rentals
          </Button>
          <Button
            variant={tab === "bus" ? "default" : "outline"}
            onClick={() => {
              setTab("bus");
              setBusPage(1);
            }}
            className={
              tab === "bus" ? "bg-gradient-primary text-primary-foreground" : ""
            }
          >
            <BusFront className="h-4 w-4 mr-2" /> Bus Bookings
          </Button>
          <Button
            variant={tab === "package" ? "default" : "outline"}
            onClick={() => {
              setTab("package");
              setPackagePage(1);
            }}
            className={
              tab === "package"
                ? "bg-gradient-primary text-primary-foreground"
                : ""
            }
          >
            <Package className="h-4 w-4 mr-2" /> Package Trips
          </Button>
          <Button
            variant={tab === "topup" ? "default" : "outline"}
            onClick={() => {
              setTab("topup");
            }}
            className={
              tab === "topup"
                ? "bg-gradient-primary text-primary-foreground"
                : ""
            }
          >
            <Coins className="h-4 w-4 mr-2" /> Coin Top-ups
          </Button>
        </div>

        {/* Pending Bus Tickets Section - Show when in bus tab and active section */}
        {tab === "bus" &&
          section === "active" &&
          pendingBusTickets.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Pending Ticket Requests
              </h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pendingBusTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="rounded-lg border border-warning/30 bg-warning/5 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {ticket.busName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ticket.travelDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Pending
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Seats Requested
                        </p>
                        <p className="font-medium">{ticket.seats}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Pickup Location
                        </p>
                        <p className="font-medium">{ticket.pickupLocation}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-warning bg-warning/10 rounded px-2 py-2">
                      Awaiting admin confirmation. We'll notify you once your
                      request is approved.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Coin Top-ups Section */}
        {tab === "topup" && (
          <div>
            <div className="mb-6 flex gap-2">
              <Button
                variant={section === "active" ? "default" : "outline"}
                onClick={() => {
                  setSection("active");
                  setTopupPage(1);
                }}
                className={
                  section === "active"
                    ? "bg-gradient-primary text-primary-foreground"
                    : ""
                }
              >
                Pending & Active
              </Button>
              <Button
                variant={section === "completed" ? "default" : "outline"}
                onClick={() => {
                  setSection("completed");
                  setTopupPage(1);
                }}
                className={
                  section === "completed"
                    ? "bg-gradient-primary text-primary-foreground"
                    : ""
                }
              >
                Completed
              </Button>
            </div>

            {topupRequests.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-20 text-center shadow-card">
                <p className="text-muted-foreground mb-4">
                  No coin top-up requests yet.
                </p>
              </div>
            ) : (
              <>
                {(() => {
                  const filtered = topupRequests.filter((tr) => {
                    if (section === "active") {
                      return ["pending"].includes(tr.status);
                    }
                    return ["approved", "rejected"].includes(tr.status);
                  });
                  const topupTotalPages = Math.ceil(
                    filtered.length / ITEMS_PER_PAGE,
                  );
                  const topupStartIdx = (topupPage - 1) * ITEMS_PER_PAGE;
                  const paginatedTopups = filtered.slice(
                    topupStartIdx,
                    topupStartIdx + ITEMS_PER_PAGE,
                  );

                  return (
                    <>
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {paginatedTopups.map((topup) => {
                          const StatusIcon =
                            topup.status === "pending"
                              ? Clock
                              : topup.status === "approved"
                                ? CheckCircle2
                                : XCircle;
                          const statusColor =
                            topup.status === "pending"
                              ? "border-warning/30 bg-warning/5"
                              : topup.status === "approved"
                                ? "border-success/30 bg-success/5"
                                : "border-destructive/30 bg-destructive/5";
                          const statusTextColor =
                            topup.status === "pending"
                              ? "text-warning"
                              : topup.status === "approved"
                                ? "text-success"
                                : "text-destructive";

                          return (
                            <div
                              key={topup._id}
                              className={`rounded-lg border p-4 ${statusColor}`}
                            >
                              <div className="mb-3 flex items-start justify-between">
                                <div>
                                  <p className="font-semibold text-foreground">
                                    ৳{topup.amount}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(
                                      topup.submittedAt,
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1 ${statusTextColor}`}
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {topup.status.charAt(0).toUpperCase() +
                                    topup.status.slice(1)}
                                </span>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Payment Method
                                  </p>
                                  <p className="font-medium capitalize">
                                    {topup.paymentMethod}
                                  </p>
                                </div>
                                {topup.transactionId && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Transaction ID
                                    </p>
                                    <p className="font-mono text-xs font-medium break-all">
                                      {topup.transactionId}
                                    </p>
                                  </div>
                                )}
                                {topup.description && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Details
                                    </p>
                                    <p className="text-xs">
                                      {topup.description}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {topup.status === "rejected" &&
                                topup.rejectionReason && (
                                  <p className="mt-3 text-xs bg-destructive/10 text-destructive rounded px-2 py-2">
                                    <strong>Reason:</strong>{" "}
                                    {topup.rejectionReason}
                                  </p>
                                )}
                              {topup.status === "pending" && (
                                <p className="mt-3 text-xs bg-warning/10 text-warning rounded px-2 py-2">
                                  Awaiting admin verification. Usually takes 1-2
                                  hours.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {topupTotalPages > 1 && (
                        <div className="mt-8 flex justify-center gap-2">
                          {Array.from(
                            { length: topupTotalPages },
                            (_, i) => i + 1,
                          ).map((page) => (
                            <Button
                              key={page}
                              variant={
                                page === topupPage ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setTopupPage(page)}
                              className={
                                page === topupPage
                                  ? "bg-gradient-primary text-primary-foreground"
                                  : ""
                              }
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {tab !== "topup" && shown.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-20 text-center shadow-card">
            <p className="text-muted-foreground mb-4">
              No {section === "active" ? "active" : "completed"}{" "}
              {tab === "hotel"
                ? "hotel bookings"
                : tab === "car"
                  ? "car rentals"
                  : "bus bookings"}{" "}
              yet.
            </p>
            {section === "active" && (
              <Button
                asChild
                className="bg-gradient-primary text-primary-foreground"
              >
                <Link
                  to={
                    tab === "hotel"
                      ? "/hotels"
                      : tab === "car"
                        ? "/cars"
                        : tab === "bus"
                          ? "/buses"
                          : "/holidays"
                  }
                >
                  {tab === "hotel"
                    ? "Browse Hotels"
                    : tab === "car"
                      ? "Browse Cars"
                      : tab === "bus"
                        ? "Browse Buses"
                        : "Browse Packages"}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {paginatedShown.map((b) => (
                <BookingCard
                  key={b._id}
                  booking={b}
                  onViewDetails={(id) => {
                    setSelectedBookingId(id);
                    setShowDetails(true);
                  }}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (tab === "hotel") {
                          setHotelPage(page);
                        } else if (tab === "car") {
                          setCarPage(page);
                        } else {
                          setBusPage(page);
                        }
                      }}
                      className={
                        page === currentPage
                          ? "bg-gradient-primary text-primary-foreground"
                          : ""
                      }
                    >
                      {page}
                    </Button>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBookingId && (
        <BookingDetail
          isOpen={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedBookingId(null);
          }}
          bookingId={selectedBookingId}
        />
      )}

      <Footer />
    </div>
  );
};

export default UserDashboard;
