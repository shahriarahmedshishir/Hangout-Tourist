import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, imgUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  BedDouble,
  AlertCircle,
} from "lucide-react";

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user && user.role === "hotel_staff") {
      navigate("/staff", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [searched, setSearched] = useState(false);
  const [activeImage, setActiveImage] = useState({});
  const [selectedRooms, setSelectedRooms] = useState([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    api
      .get(`/api/hotels/${id}`)
      .then((data) => {
        setHotel(data);
        setRooms(data.rooms || []);
      })
      .catch(() => navigate("/hotels"))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-fetch availability when dates are selected
  useEffect(() => {
    if (!checkIn || !checkOut) return;

    setSelectedRooms([]);
    setLoading(true);
    api
      .get(`/api/hotels/${id}/rooms?checkIn=${checkIn}&checkOut=${checkOut}`)
      .then((data) => {
        setRooms(data);
        setSearched(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [checkIn, checkOut, id]);

  const toggleRoom = (room) => {
    setSelectedRooms((prev) =>
      prev.find((r) => r._id === room._id)
        ? prev.filter((r) => r._id !== room._id)
        : [...prev, room],
    );
  };

  const handleProceed = () => {
    if (!user) {
      toast({
        title: "Please Login First",
        description: "You need to log in before you can book a room.",
        duration: 3000,
      });
      setTimeout(() => {
        navigate("/login");
      }, 500);
      return;
    }

    // Validate that all selected rooms are still available
    const bookedRooms = selectedRooms.filter(
      (r) => r.isBooked || r.isAvailable === false,
    );
    if (bookedRooms.length > 0) {
      toast({
        title: "Room No Longer Available",
        description:
          "One or more of your selected rooms has been booked. Please select different rooms.",
        duration: 3000,
      });
      setSelectedRooms([]);
      return;
    }

    navigate("/booking/hotel", {
      state: { hotel, rooms: selectedRooms, checkIn, checkOut },
    });
  };

  if (loading && !hotel) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12">
          <div className="h-64 rounded-2xl bg-muted animate-pulse mb-6" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const days =
    checkIn && checkOut
      ? Math.ceil(
          (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
        )
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <button
          onClick={() => navigate("/hotels")}
          className="mb-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Hotels
        </button>

        {hotel && (
          <>
            {/* Hotel Header */}
            <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <div className="relative h-56 overflow-hidden bg-muted md:h-72">
                {hotel.image ? (
                  <img
                    src={imgUrl(hotel.image)}
                    alt={hotel.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl">
                    🏨
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-5 left-5 text-white">
                  <h1 className="font-heading text-3xl font-extrabold">
                    {hotel.name}
                  </h1>
                  {hotel.area && (
                    <p className="mt-1 flex items-center gap-1 text-sm opacity-90">
                      <MapPin className="h-4 w-4" /> {hotel.area}
                    </p>
                  )}
                </div>
              </div>
              <div className="p-5">
                {hotel.description && (
                  <p className="text-muted-foreground">{hotel.description}</p>
                )}
                {hotel.services?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hotel.services.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-4 font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" /> Select Your
                Dates
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Check-In
                  </label>
                  <Input
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="bg-muted"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Check-Out
                  </label>
                  <Input
                    type="date"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="bg-muted"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      // Scroll to rooms section
                      const roomsSection =
                        document.querySelector("h2:has(svg)");
                      roomsSection?.scrollIntoView({ behavior: "smooth" });
                    }}
                    disabled={!checkIn || !checkOut}
                    className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                  >
                    View Available Rooms
                  </Button>
                </div>
              </div>
              {days > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {days} night{days > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Rooms */}
            <h2 className="mb-4 font-heading text-xl font-bold text-foreground flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-primary" />
              {searched ? "Available Rooms for Selected Dates" : "All Rooms"}
            </h2>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 rounded-2xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
                {searched
                  ? "No rooms available for the selected dates."
                  : "No rooms found."}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {rooms
                  .filter(
                    (room) =>
                      !searched ||
                      (!room.isBooked && room.isAvailable !== false),
                  )
                  .map((room, i) => {
                    const currentImg = activeImage[room._id] || 0;
                    const isBooked =
                      room.isBooked || room.isAvailable === false;
                    const isAdminBlocked = room.isAdminBlocked;
                    return (
                      <div
                        key={room._id}
                        className={`overflow-hidden rounded-2xl border bg-card shadow-card animate-fade-in ${isBooked ? "border-destructive/30 opacity-80" : "border-border"}`}
                        style={{ animationDelay: `${i * 0.06}s` }}
                      >
                        {/* Room Images */}
                        {room.images?.length > 0 ? (
                          <div className="relative h-44 overflow-hidden bg-muted">
                            <img
                              src={imgUrl(room.images[currentImg])}
                              alt={`Room ${room.roomNumber}`}
                              className="h-full w-full object-cover"
                            />
                            {room.images.length > 1 && (
                              <>
                                <button
                                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60 transition-colors z-10"
                                  onClick={() =>
                                    setActiveImage((p) => ({
                                      ...p,
                                      [room._id]:
                                        ((p[room._id] || 0) -
                                          1 +
                                          room.images.length) %
                                        room.images.length,
                                    }))
                                  }
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </button>
                                <button
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60 transition-colors z-10"
                                  onClick={() =>
                                    setActiveImage((p) => ({
                                      ...p,
                                      [room._id]:
                                        ((p[room._id] || 0) + 1) %
                                        room.images.length,
                                    }))
                                  }
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                                  {room.images.map((_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() =>
                                        setActiveImage((p) => ({
                                          ...p,
                                          [room._id]: idx,
                                        }))
                                      }
                                      className={`h-1.5 w-1.5 rounded-full transition-all ${
                                        idx === currentImg
                                          ? "bg-white scale-125"
                                          : "bg-white/50"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                            {isBooked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <span className="rounded-full bg-destructive px-4 py-1 text-sm font-semibold text-white">
                                  {room.isAvailable === false
                                    ? "Flagged Unavailable"
                                    : isAdminBlocked
                                      ? "Reserved"
                                      : "Booked"}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`flex h-24 items-center justify-center text-4xl bg-muted ${isBooked ? "opacity-50" : ""}`}
                          >
                            🛏️
                          </div>
                        )}

                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-heading font-bold text-foreground">
                              Room {room.roomNumber}
                            </h3>
                            <span className="font-heading text-xl font-bold text-primary">
                              ৳{(room.price || 0).toLocaleString()}
                              <span className="text-xs font-normal text-muted-foreground">
                                /night
                              </span>
                            </span>
                          </div>

                          {room.services?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {room.services.map((s) => (
                                <span
                                  key={s}
                                  className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}

                          {isBooked && room.nextAvailable && (
                            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <AlertCircle className="h-3 w-3 text-warning" />
                              Available from{" "}
                              {new Date(
                                room.nextAvailable,
                              ).toLocaleDateString()}
                            </p>
                          )}

                          {days > 0 && !isBooked && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Total for {days} night{days > 1 ? "s" : ""}:{" "}
                              <span className="font-semibold text-foreground">
                                ৳{((room.price || 0) * days).toLocaleString()}
                              </span>
                            </p>
                          )}

                          {(() => {
                            const isSelected = !!selectedRooms.find(
                              (r) => r._id === room._id,
                            );
                            return (
                              <Button
                                disabled={isBooked || !checkIn || !checkOut}
                                onClick={() =>
                                  !isBooked && checkIn && checkOut
                                    ? toggleRoom(room)
                                    : undefined
                                }
                                variant={isSelected ? "default" : "outline"}
                                className={`mt-3 w-full disabled:opacity-50 ${
                                  isSelected
                                    ? "bg-gradient-primary text-primary-foreground"
                                    : ""
                                }`}
                                size="sm"
                              >
                                {isBooked
                                  ? "Not Available"
                                  : !checkIn || !checkOut
                                    ? "Select Dates First"
                                    : isSelected
                                      ? "✓ Selected"
                                      : "Select Room"}
                              </Button>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>
      {/* Sticky booking bar */}
      {selectedRooms.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm shadow-elevated">
          <div className="container flex items-center justify-between gap-4 py-3">
            <div>
              <p className="font-semibold text-foreground">
                {selectedRooms.length} room
                {selectedRooms.length > 1 ? "s" : ""} selected
              </p>
              {days > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total ৳
                  {selectedRooms
                    .reduce((s, r) => s + (r.price || 0) * days, 0)
                    .toLocaleString()}{" "}
                  for {days} night{days > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRooms([])}
              >
                Clear
              </Button>
              <Button
                className="bg-gradient-primary text-primary-foreground"
                onClick={handleProceed}
                disabled={!checkIn || !checkOut}
              >
                Book {selectedRooms.length} Room
                {selectedRooms.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
