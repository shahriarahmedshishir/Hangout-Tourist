import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Hotel,
  BedDouble,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  CalendarRange,
} from "lucide-react";

const StaffDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login");
        return;
      }
      if (user.role !== "hotel_staff") {
        navigate("/");
        return;
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || user.role !== "hotel_staff") return;
    Promise.all([api.get("/api/staff/hotel"), api.get("/api/staff/rooms")])
      .then(([hotelData, { rooms: roomList, bookings: bookingList }]) => {
        setHotel(hotelData);
        // Attach active bookings to each room
        const roomsWithBookings = roomList.map((room) => ({
          ...room,
          activeBookings: bookingList.filter(
            (b) => b.roomId === room._id.toString(),
          ),
        }));
        setRooms(roomsWithBookings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

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

  const bookedRooms = rooms.filter((r) => r.activeBookings?.length > 0);
  const freeRooms = rooms.filter(
    (r) => !r.activeBookings?.length && r.isAvailable !== false,
  );
  const unavailableRooms = rooms.filter((r) => r.isAvailable === false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-primary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-primary-foreground">
            Staff Dashboard
          </h1>
          <p className="text-primary-foreground/80">
            {hotel?.name || user?.hotelName || "Your Hotel"}
          </p>
        </div>
      </div>

      <div className="container py-10">
        {/* Hotel info */}
        {hotel && (
          <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <Hotel className="h-6 w-6 text-primary" />
              <h2 className="font-heading text-xl font-bold text-foreground">
                {hotel.name}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">{hotel.area}</p>
            {hotel.description && (
              <p className="mt-2 text-sm text-foreground">
                {hotel.description}
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Rooms",
              value: rooms.length,
              icon: <BedDouble className="h-5 w-5" />,
              color: "text-primary",
            },
            {
              label: "Currently Booked",
              value: bookedRooms.length,
              icon: <Calendar className="h-5 w-5" />,
              color: "text-yellow-600",
            },
            {
              label: "Available",
              value: freeRooms.length,
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

        {/* Room list */}
        <h2 className="mb-4 font-heading text-lg font-bold text-foreground">
          Room Status
        </h2>
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center shadow-card text-muted-foreground">
            No rooms assigned to this hotel yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => {
              const isBooked = room.activeBookings?.length > 0;
              const isUnavailable = room.isAvailable === false;
              return (
                <div
                  key={room._id}
                  className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
                >
                  {/* Room image */}
                  {room.images?.length > 0 ? (
                    <img
                      src={imgUrl(room.images[0])}
                      alt={`Room ${room.roomNumber}`}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="h-40 w-full bg-muted flex items-center justify-center">
                      <BedDouble className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-primary" />
                        <span className="font-heading font-bold text-foreground">
                          Room {room.roomNumber}
                        </span>
                      </div>
                      {isUnavailable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          <XCircle className="h-3 w-3" /> Unavailable
                        </span>
                      ) : isBooked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          <Calendar className="h-3 w-3" /> Booked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          <CheckCircle2 className="h-3 w-3" /> Available
                        </span>
                      )}
                    </div>

                    {room.services?.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {room.services.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Admin-blocked dates */}
                    {room.blockedDates?.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-warning">
                          <CalendarRange className="h-3 w-3" /> Reserved /
                          Blocked
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {room.blockedDates.map((b) => (
                            <span
                              key={b._id}
                              className="rounded-lg bg-warning/10 px-2 py-1 text-xs text-warning font-medium"
                            >
                              {new Date(b.checkIn).toLocaleDateString()} →{" "}
                              {new Date(b.checkOut).toLocaleDateString()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bookings for this room */}
                    {room.activeBookings?.length > 0 && (
                      <div className="space-y-2">
                        {room.activeBookings.map((b) => (
                          <div
                            key={b._id}
                            className="rounded-xl bg-muted p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>
                                Guest{" "}
                                <span className="font-mono">
                                  #{String(b.userId).slice(-6)}
                                </span>
                              </span>
                            </div>
                            <div className="text-foreground font-medium">
                              {fmt(b.checkIn)} → {fmt(b.checkOut)}
                            </div>
                            <div className="text-muted-foreground">
                              {b.days} night{b.days !== 1 ? "s" : ""}
                            </div>
                            <div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${b.status === "confirmed" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                              >
                                {b.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default StaffDashboard;
