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
  Heart,
  Share2,
  Wifi,
  UtensilsCrossed,
  Droplet,
  Dumbbell,
  Phone,
  Clock,
  Users,
  Info,
  MapPinIcon,
  Award,
  CheckCircle2,
  X,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeImage, setActiveImage] = useState(0);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [showGallery, setShowGallery] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState("rooms");

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

  const handleShare = () => {
    const shareText = `Check out ${hotel?.name} on our booking platform! 🏨`;
    if (navigator.share) {
      navigator.share({
        title: hotel?.name,
        text: shareText,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Hotel link copied to clipboard!",
        duration: 2000,
      });
    }
  };

  if (loading && !hotel) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-96 bg-muted animate-pulse" />
        <div className="container py-12">
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-muted animate-pulse"
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

  const totalPrice = selectedRooms.reduce(
    (sum, r) => sum + (r.price || 0) * days,
    0,
  );

  const availableRooms = rooms.filter(
    (room) => !searched || (!room.isBooked && room.isAvailable !== false),
  );

  const amenityIcons = {
    "Free WiFi": <Wifi className="h-5 w-5" />,
    "Breakfast Included": <UtensilsCrossed className="h-5 w-5" />,
    "Swimming Pool": <Droplet className="h-5 w-5" />,
    Gym: <Dumbbell className="h-5 w-5" />,
    "24/7 Support": <Clock className="h-5 w-5" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {hotel && (
        <>
          {/* Image Gallery Hero */}
          <div className="relative h-96 bg-muted overflow-hidden">
            <img
              src={imgUrl(hotel.image)}
              alt={hotel.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Top Controls */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
              <button
                onClick={() => navigate("/hotels")}
                className="flex items-center gap-2 bg-white/90 hover:bg-white text-foreground px-3 py-2 rounded-full transition-colors shadow-md"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-2 rounded-full transition-all shadow-md ${
                    isFavorite
                      ? "bg-red-500 text-white"
                      : "bg-white/90 hover:bg-white text-foreground"
                  }`}
                >
                  <Heart
                    className="h-5 w-5"
                    fill={isFavorite ? "currentColor" : "none"}
                  />
                </button>
                <button
                  onClick={handleShare}
                  className="bg-white/90 hover:bg-white text-foreground p-2 rounded-full transition-colors shadow-md"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* View All Photos Button */}
            <button
              onClick={() => setShowGallery(true)}
              className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-foreground px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-md flex items-center gap-2 z-20"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                />
              </svg>
              View All Photos
            </button>

            {/* Gallery Modal */}
            <Dialog open={showGallery} onOpenChange={setShowGallery}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="relative h-96">
                  {hotel.image && (
                    <img
                      src={imgUrl(hotel.image)}
                      alt={hotel.name}
                      className="h-full w-full object-cover rounded-lg"
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Hotel Header Info */}
          <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="container py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
                    {hotel.name}
                  </h1>
                  {hotel.area && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" /> {hotel.area}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < 4
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      4.5 (128 reviews)
                    </span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Price per night
                  </p>
                  {availableRooms.length > 0 ? (
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        ৳
                        {Math.min(
                          ...availableRooms.map((r) => r.price || 0),
                        ).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        From lowest available room
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No rooms available
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="container py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content - Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Date & Guest Selector */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <h2 className="mb-4 font-heading text-lg font-bold text-foreground flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-primary" /> Select
                    Your Dates
                  </h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Check-In
                      </label>
                      <Input
                        type="date"
                        min={today}
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="bg-muted border-border focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Check-Out
                      </label>
                      <Input
                        type="date"
                        min={checkIn || today}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="bg-muted border-border focus:border-primary"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          const roomsSection =
                            document.getElementById("rooms-section");
                          roomsSection?.scrollIntoView({ behavior: "smooth" });
                        }}
                        disabled={!checkIn || !checkOut}
                        className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-2"
                      >
                        Search Rooms
                      </Button>
                    </div>
                  </div>
                  {days > 0 && (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 border border-green-200">
                      <CheckCircle2 className="h-3 w-3" /> {days} night
                      {days > 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                {/* Tabs Section */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="w-full rounded-none border-b bg-muted/50 grid grid-cols-4 h-auto p-0">
                      <TabsTrigger
                        value="overview"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      >
                        <span className="hidden sm:inline">Overview</span>
                        <span className="sm:hidden">Info</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="amenities"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      >
                        Amenities
                      </TabsTrigger>
                      <TabsTrigger
                        value="rooms"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      >
                        Rooms
                      </TabsTrigger>
                      <TabsTrigger
                        value="policies"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      >
                        Policies
                      </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="p-6 space-y-4">
                      <div>
                        <h3 className="font-heading font-bold text-foreground mb-2">
                          About this property
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {hotel.description ||
                            "Welcome to our premium hotel destination. Experience luxury and comfort with world-class amenities and exceptional service. Located in the heart of the city, we offer the perfect blend of convenience and elegance."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Premium Quality
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Top-rated accommodation
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              Free Cancellation
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cancel anytime
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Amenities Tab */}
                    <TabsContent value="amenities" className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(
                          hotel.services || [
                            "Free WiFi",
                            "24/7 Support",
                            "Swimming Pool",
                            "Gym",
                            "Breakfast Included",
                          ]
                        ).map((service, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            <div className="text-primary">
                              {amenityIcons[service] || (
                                <CheckCircle2 className="h-5 w-5" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {service}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Rooms Tab */}
                    <TabsContent value="rooms" className="p-0">
                      <div id="rooms-section" className="space-y-4 p-6">
                        {loading ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            {[...Array(3)].map((_, i) => (
                              <div
                                key={i}
                                className="h-64 rounded-xl bg-muted animate-pulse"
                              />
                            ))}
                          </div>
                        ) : availableRooms.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-8 text-center">
                            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">
                              {searched
                                ? "No rooms available for the selected dates."
                                : "Please select dates to view available rooms."}
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            {availableRooms.map((room, idx) => {
                              const isSelected = !!selectedRooms.find(
                                (r) => r._id === room._id,
                              );
                              const isBooked =
                                room.isBooked || room.isAvailable === false;
                              return (
                                <RoomCard
                                  key={room._id}
                                  room={room}
                                  isSelected={isSelected}
                                  isBooked={isBooked}
                                  days={days}
                                  checkIn={checkIn}
                                  checkOut={checkOut}
                                  onToggle={() => toggleRoom(room)}
                                  idx={idx}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Policies Tab */}
                    <TabsContent value="policies" className="p-6 space-y-4">
                      <PolicyItem
                        icon={<Clock className="h-5 w-5" />}
                        title="Check-in & Check-out"
                        content="Check-in: 2:00 PM | Check-out: 12:00 PM"
                      />
                      <PolicyItem
                        icon={<AlertCircle className="h-5 w-5" />}
                        title="Cancellation Policy"
                        content="Free cancellation up to 48 hours before check-in. Cancellations within 48 hours may incur a full charge."
                      />
                      <PolicyItem
                        icon={<Users className="h-5 w-5" />}
                        title="House Rules"
                        content="No smoking inside rooms. Guests must be 18+. Quiet hours: 10 PM - 8 AM. Pets not allowed."
                      />
                      <PolicyItem
                        icon={<Info className="h-5 w-5" />}
                        title="Important Information"
                        content="Valid ID required at check-in. Payment must be completed 24 hours before check-in. For any queries, contact our 24/7 support."
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Featured Reviews Section */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <h3 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    Guest Reviews
                  </h3>
                  <div className="space-y-4">
                    {[1, 2].map((idx) => (
                      <div
                        key={idx}
                        className="border-b border-border pb-4 last:border-0"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              Guest {idx}
                            </p>
                            <div className="flex gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className="h-3 w-3 fill-amber-400 text-amber-400"
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            2 months ago
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Excellent property with great hospitality. The staff
                          was very courteous and helpful. Rooms are clean and
                          well-maintained.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar - Booking Card */}
              <div className="lg:col-span-1">
                <div className="sticky top-32 space-y-4">
                  {/* Booking Summary Card */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                    <h3 className="font-heading font-bold text-foreground mb-4">
                      Booking Summary
                    </h3>

                    {days > 0 ? (
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Check-in:
                          </span>
                          <span className="font-medium text-foreground">
                            {new Date(checkIn).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Check-out:
                          </span>
                          <span className="font-medium text-foreground">
                            {new Date(checkOut).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm pb-3 border-b border-border">
                          <span className="text-muted-foreground">
                            Duration:
                          </span>
                          <span className="font-medium text-foreground">
                            {days} night{days > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rooms:</span>
                          <span className="font-semibold text-foreground">
                            {selectedRooms.length}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Select dates to see pricing
                      </p>
                    )}

                    {selectedRooms.length > 0 && (
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                        <p className="text-xs text-muted-foreground mb-1">
                          Total Price
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          ৳{totalPrice.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          for {days} night{days > 1 ? "s" : ""}
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleProceed}
                      disabled={
                        selectedRooms.length === 0 || !checkIn || !checkOut
                      }
                      className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 py-3 text-base"
                    >
                      {selectedRooms.length > 0
                        ? `Book ${selectedRooms.length} Room${selectedRooms.length > 1 ? "s" : ""}`
                        : "Select Rooms"}
                    </Button>
                  </div>

                  {/* Info Card */}
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Support
                          </p>
                          <p className="font-medium text-foreground text-sm">
                            +880 1234 567890
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 pt-2 border-t border-border">
                        <MapPinIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Location
                          </p>
                          <p className="font-medium text-foreground text-sm">
                            {hotel.area}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}

// Room Card Component
function RoomCard({
  room,
  isSelected,
  isBooked,
  days,
  checkIn,
  checkOut,
  onToggle,
  idx,
}) {
  const [currentImg, setCurrentImg] = useState(0);

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-all animate-fade-in ${
        isBooked
          ? "border-destructive/30 opacity-70 bg-muted/50"
          : isSelected
            ? "border-primary bg-primary/5 shadow-lg"
            : "border-border bg-card hover:shadow-md"
      }`}
      style={{ animationDelay: `${idx * 0.06}s` }}
    >
      {/* Room Images */}
      <div className="relative h-40 bg-muted overflow-hidden">
        {room.images?.length > 0 ? (
          <>
            <img
              src={imgUrl(room.images[currentImg])}
              alt={`Room ${room.roomNumber}`}
              className="h-full w-full object-cover"
            />
            {room.images.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImg(
                      (p) => (p - 1 + room.images.length) % room.images.length,
                    );
                  }}
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImg((p) => (p + 1) % room.images.length);
                  }}
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">
            🛏️
          </div>
        )}
        {isBooked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-white">
              Not Available
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-heading font-bold text-foreground">
            Room {room.roomNumber}
          </h4>
          <span className="text-lg font-bold text-primary">
            ৳{(room.price || 0).toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground">
              /night
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span>
            👥{" "}
            {room.maxGuests
              ? `Max ${room.maxGuests} Guest${room.maxGuests > 1 ? "s" : ""}`
              : "Max Guests: Not Mentioned"}
          </span>
          {room.mealPlan && (
            <>
              <span>•</span>
              <span>🍽️ {room.mealPlan}</span>
            </>
          )}
        </div>

        {room.services?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {room.services.slice(0, 2).map((s) => (
              <span
                key={s}
                className="rounded-full bg-accent/70 px-2 py-0.5 text-xs text-accent-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {days > 0 && !isBooked && (
          <p className="text-xs text-muted-foreground mb-3 pb-3 border-b border-border">
            Total:{" "}
            <span className="font-semibold text-foreground">
              ৳{((room.price || 0) * days).toLocaleString()}
            </span>
          </p>
        )}

        <Button
          disabled={isBooked || !checkIn || !checkOut}
          onClick={onToggle}
          variant={isSelected ? "default" : "outline"}
          className={`w-full py-2 text-sm ${
            isSelected ? "bg-gradient-primary text-primary-foreground" : ""
          }`}
        >
          {isBooked
            ? "Not Available"
            : !checkIn || !checkOut
              ? "Select Dates"
              : isSelected
                ? "✓ Selected"
                : "Select Room"}
        </Button>
      </div>
    </div>
  );
}

// Policy Item Component
function PolicyItem({ icon, title, content }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <span className="text-primary">{icon}</span>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>
      {expanded && (
        <div className="px-4 py-3 bg-muted/50 border-t border-border text-sm text-muted-foreground">
          {content}
        </div>
      )}
    </div>
  );
}
