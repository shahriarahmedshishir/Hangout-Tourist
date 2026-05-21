import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Invoice from "./Invoice";
import {
  Hotel,
  Car,
  BusFront,
  Package,
  X,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";

const BookingDetail = ({ isOpen, onClose, bookingId }) => {
  const { user, socket } = useAuth();
  const [booking, setBooking] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBookingDetails();
    }
  }, [isOpen, bookingId]);

  // Listen for cancellation approval/rejection to refresh booking data
  useEffect(() => {
    if (!socket || !bookingId) return;

    const handleApproved = ({ bookingId: approvedBookingId }) => {
      if (approvedBookingId === bookingId) {
        fetchBookingDetails();
      }
    };

    const handleRejected = ({ bookingId: rejectedBookingId }) => {
      if (rejectedBookingId === bookingId) {
        fetchBookingDetails();
      }
    };

    const handleRefunded = ({ bookingId: refundedBookingId }) => {
      if (refundedBookingId === bookingId) {
        fetchBookingDetails();
      }
    };

    socket.on("cancel-approved", handleApproved);
    socket.on("cancel-rejected", handleRejected);
    socket.on("booking-refunded", handleRefunded);

    return () => {
      socket.off("cancel-approved", handleApproved);
      socket.off("cancel-rejected", handleRejected);
      socket.off("booking-refunded", handleRefunded);
    };
  }, [socket, bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setCancelError("");

      // Try to fetch from bookings endpoint first
      let data;
      let isCarRental = false;

      try {
        data = await api.get(`/api/bookings/${bookingId}`);
      } catch (err) {
        // If not in bookings collection, try carrent bookings
        if (err.status === 404) {
          data = await api.get(`/api/carrent/booking/${bookingId}`);
          isCarRental = true;
        } else {
          throw err;
        }
      }

      setBooking(data);

      // Fetch invoice from correct endpoint based on booking type
      let invoiceData;
      if (isCarRental || data.type === "car") {
        invoiceData = await api.get(
          `/api/carrent/booking/${bookingId}/invoice`,
        );
      } else {
        invoiceData = await api.get(`/api/bookings/${bookingId}/invoice`);
      }
      setInvoice(invoiceData);
    } catch (err) {
      setCancelError(err.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const parseBookingDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(value);
  };

  const canCancelBooking = () => {
    if (!booking || booking.status !== "confirmed") return false;

    const checkInTime = parseBookingDate(
      booking.checkIn || booking.pickupDate || booking.travelDate,
    );
    const now = new Date();
    const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);

    return hoursUntilCheckIn > 24;
  };

  const getHoursUntilCheckIn = () => {
    if (!booking) return 0;
    const checkInTime = parseBookingDate(
      booking.checkIn || booking.pickupDate || booking.travelDate,
    );
    const now = new Date();
    const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);
    return Math.max(0, Math.ceil(hoursUntilCheckIn - 24));
  };

  const handleCancelRequest = async () => {
    if (!booking) return;

    try {
      setCancelling(true);
      setCancelError("");

      await api.post(`/api/bookings/${bookingId}/cancel-request`, {
        reason: "Booking cancellation request",
      });

      // Refresh booking details and then close modal
      await fetchBookingDetails();
      setTimeout(() => {
        onClose();
        alert("Cancellation request submitted! Admin will review it shortly.");
      }, 500);
    } catch (err) {
      setCancelError(err.message || "Failed to submit cancellation request");
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isHotel = booking?.type === "hotel";
  const isCar = booking?.type === "car";
  const isBus = booking?.type === "bus";
  const isPackage = booking?.type === "package" || booking?.type === "holiday";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={
          showInvoice
            ? "max-w-4xl max-h-[90vh] overflow-y-auto"
            : "max-w-2xl max-h-[90vh] overflow-y-auto"
        }
      >
        <DialogHeader>
          <DialogTitle>
            {showInvoice ? "Invoice" : "Booking Details"}
          </DialogTitle>
        </DialogHeader>

        {showInvoice ? (
          <Invoice invoice={invoice} onClose={() => setShowInvoice(false)} />
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : booking ? (
          <div className="space-y-6">
            {isPackage && booking.packageDetails?.image && (
              <div className="overflow-hidden rounded-[1.5rem]">
                <img
                  src={imgUrl(booking.packageDetails.image)}
                  alt={booking.packageName || "Holiday Package"}
                  className="h-48 w-full object-cover"
                />
              </div>
            )}
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-3 ${
                    isHotel
                      ? "bg-primary/10"
                      : isBus
                        ? "bg-blue/10"
                        : isPackage
                          ? "bg-violet-100"
                          : "bg-secondary/10"
                  }`}
                >
                  {isHotel ? (
                    <Hotel className="h-6 w-6 text-primary" />
                  ) : isBus ? (
                    <BusFront className="h-6 w-6 text-blue-600" />
                  ) : isPackage ? (
                    <Package className="h-6 w-6 text-violet-600" />
                  ) : (
                    <Car className="h-6 w-6 text-secondary" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {isHotel
                      ? booking.hotelName
                      : isBus
                        ? booking.busName
                        : isPackage
                          ? booking.packageName || "Holiday Package"
                          : booking.carName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isHotel
                      ? `Room ${booking.roomNumber}`
                      : isBus
                        ? `Seats: ${booking.seats}`
                        : isPackage
                          ? `${booking.peopleCount || 1} people`
                          : booking.carType}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                  booking.status === "confirmed"
                    ? "bg-success/10 text-success"
                    : booking.status === "cancelled"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-warning/10 text-warning"
                }`}
              >
                {booking.status === "confirmed" && (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> Confirmed
                  </>
                )}
                {booking.status === "cancelled" && (
                  <>
                    <X className="h-3 w-3" /> Cancelled
                  </>
                )}
              </span>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              {isHotel && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Check-in Date
                    </p>
                    <p className="font-semibold">
                      {formatDate(booking.checkIn)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Check-out Date
                    </p>
                    <p className="font-semibold">
                      {formatDate(booking.checkOut)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Duration
                    </p>
                    <p className="font-semibold">
                      {booking.days} day{booking.days !== 1 ? "s" : ""}
                    </p>
                  </div>
                </>
              )}
              {isCar && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Pick-up Date
                    </p>
                    <p className="font-semibold">
                      {formatDate(booking.pickupDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Return Date
                    </p>
                    <p className="font-semibold">
                      {formatDate(booking.returnDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Duration
                    </p>
                    <p className="font-semibold">
                      {booking.days} day{booking.days !== 1 ? "s" : ""}
                    </p>
                  </div>
                </>
              )}
              {isBus && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Travel Date
                    </p>
                    <p className="font-semibold">
                      {formatDate(booking.travelDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Departure Time
                    </p>
                    <p className="font-semibold">
                      {booking.departureTime || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Pickup Location
                    </p>
                    <p className="font-semibold">
                      {booking.pickupLocation || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Seats</p>
                    <p className="font-semibold">{booking.seats || "N/A"}</p>
                  </div>
                </>
              )}
              {isPackage && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Travel Date
                    </p>
                    <p className="font-semibold">
                      {formatDate(booking.travelDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">People</p>
                    <p className="font-semibold">{booking.peopleCount || 1}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Price Per Person
                    </p>
                    <p className="font-semibold">
                      ৳{(booking.pricePerPerson || 0).toLocaleString()}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Total Amount
                </p>
                <p className="font-bold text-primary">
                  ৳{(booking.totalAmount || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Guest Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm">Guest Information</h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Name: </span>
                  <span>{user?.name || "N/A"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Email: </span>
                  <span>{user?.email || "N/A"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Phone: </span>
                  <span>{booking.contactNumber || "N/A"}</span>
                </p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-sm">
                Payment Information
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Method: </span>
                  <span className="capitalize">{booking.paymentMethod}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Transaction ID:{" "}
                  </span>
                  <span className="font-mono text-xs">
                    {booking.transactionId}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Paid Date: </span>
                  <span>{formatDate(booking.paidAt)}</span>
                </p>
              </div>
            </div>

            {/* Refund Status */}
            {booking.status === "cancelled" && (
              <div
                className={`rounded-lg p-4 ${
                  booking.refundStatus === "completed"
                    ? "bg-success/10 border border-success/20"
                    : booking.refundStatus === "in_progress"
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-blue-50 border border-blue-200"
                }`}
              >
                <h4 className="font-semibold mb-2 text-sm">Refund Status</h4>
                <div className="space-y-2 text-sm">
                  {booking.refundAmount && (
                    <p className="font-medium">
                      Refund Amount:{" "}
                      <span className="text-primary">
                        ৳{booking.refundAmount.toFixed(2)}
                      </span>
                    </p>
                  )}
                  {booking.refundStatus === "completed" ? (
                    <div className="space-y-1">
                      <p className="text-success flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Refund Completed
                      </p>
                      {booking.refundScreenshot && (
                        <a
                          href={imgUrl(booking.refundScreenshot)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary text-xs underline"
                        >
                          View refund screenshot
                        </a>
                      )}
                    </div>
                  ) : booking.refundStatus === "in_progress" ? (
                    <p className="text-yellow-700 flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      Refund in Progress
                    </p>
                  ) : (
                    <p className="text-blue-700">
                      Cancellation approved. Awaiting refund initiation.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cancellation In Progress */}
            {cancelling && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-blue-900 flex items-center gap-2 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancellation in Progress...
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Please wait while we process your cancellation request.
                </p>
              </div>
            )}

            {/* Cancel Request Status */}
            {booking.cancelRequest && (
              <div
                className={`rounded-lg p-4 border ${
                  booking.cancelRequest.status === "approved"
                    ? "bg-success/10 border-success/20"
                    : booking.cancelRequest.status === "pending"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-destructive/10 border-destructive/20"
                }`}
              >
                <h4 className="font-semibold mb-2 text-sm">Cancel Request</h4>
                <p className="text-sm capitalize">
                  Status:{" "}
                  <span
                    className={
                      booking.cancelRequest.status === "approved"
                        ? "text-success font-medium"
                        : booking.cancelRequest.status === "pending"
                          ? "text-blue-700 font-medium"
                          : "text-destructive font-medium"
                    }
                  >
                    {booking.cancelRequest.status}
                  </span>
                </p>
              </div>
            )}

            {/* Error Message */}
            {cancelError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{cancelError}</p>
              </div>
            )}

            {/* Cancel Notice */}
            {canCancelBooking() &&
              booking.status === "confirmed" &&
              !booking.cancelRequest && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-sm text-blue-900">
                    ⏰ You have{" "}
                    <span className="font-semibold">
                      {getHoursUntilCheckIn()}
                    </span>{" "}
                    hours remaining to cancel before the 24-hour cutoff.
                  </p>
                </div>
              )}

            {!canCancelBooking() &&
              booking.status === "confirmed" &&
              !booking.cancelRequest && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm text-amber-900">
                    ⏰ Cancellation deadline has passed. You can no longer
                    cancel this booking. Please contact support if you need
                    assistance.
                  </p>
                </div>
              )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowInvoice(true)}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Invoice
              </Button>
              {canCancelBooking() &&
                booking.status === "confirmed" &&
                !booking.cancelRequest &&
                !cancelling && (
                  <Button
                    variant="destructive"
                    onClick={handleCancelRequest}
                    className="flex-1"
                  >
                    Request Cancellation
                  </Button>
                )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Failed to load booking details
            </p>
            <Button onClick={fetchBookingDetails} className="mt-4">
              Retry
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetail;
