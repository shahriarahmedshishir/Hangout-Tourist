import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api, imgUrl } from "@/lib/api";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  BedDouble,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Droplet,
  Dumbbell,
  Heart,
  Info,
  MapPin,
  Maximize,
  Maximize2,
  Phone,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Users,
  UtensilsCrossed,
  Waves,
  Wifi,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";

const formatDateValue = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getDefaultDateRange = () => {
  const checkInDate = new Date();
  checkInDate.setHours(0, 0, 0, 0);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 1);

  return {
    checkIn: formatDateValue(checkInDate),
    checkOut: formatDateValue(checkOutDate),
  };
};

function HotelDateRangePicker({ checkIn, setCheckIn, checkOut, setCheckOut }) {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSelect = (range) => {
    if (!range?.from) {
      setCheckIn("");
      setCheckOut("");
      return;
    }

    setCheckIn(formatDateValue(range.from));
    setCheckOut(range.to ? formatDateValue(range.to) : "");

    if (range.to) setIsOpen(false);
  };

  return (
    <div className="relative md:col-span-2 min-w-0">
      <div className="grid grid-cols-2 gap-3">
        {["checkIn", "checkOut"].map((position) => {
          const value = position === "checkIn" ? checkIn : checkOut;
          return (
            <button
              key={position}
              type="button"
              onClick={() => setIsOpen(true)}
              className="border border-slate-200 rounded-xl p-2.5 flex items-center space-x-3 bg-slate-50/50 text-left hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            >
              <Calendar className="w-5 h-5 text-cyan-600 shrink-0" />
              <span className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {position === "checkIn" ? "Check-In" : "Check-Out"}
                </span>
                <span
                  className={`text-xs font-semibold block ${value ? "text-slate-800" : "text-slate-400"}`}
                >
                  {value || "Select date"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full z-30 mt-2 rounded-2xl border border-slate-200 bg-white shadow-xl">
          <DateCalendar
            mode="range"
            selected={{
              from: parseDateValue(checkIn),
              to: parseDateValue(checkOut),
            }}
            onSelect={handleSelect}
            disabled={{ before: today }}
            fromDate={today}
            initialFocus
          />
          <div className="flex justify-end border-t border-slate-100 px-3 py-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   COMPONENT 1: HotelDetail (Main Container)
   ========================================================================== */
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

  const [guests, setGuests] = useState("2 Guests, 1 Room");

  // Interactive UI state
  const [isSaved, setIsSaved] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const defaultDateRange = getDefaultDateRange();
  const [checkIn, setCheckIn] = useState(defaultDateRange.checkIn);
  const [checkOut, setCheckOut] = useState(defaultDateRange.checkOut);
  const [searched, setSearched] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [showGallery, setShowGallery] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState("rooms");

  const hotelImages = Array.isArray(hotel?.images)
    ? hotel.images
    : Array.isArray(hotel?.image)
      ? hotel.image
      : hotel?.image
        ? [hotel.image]
        : [];

  const hotelLocationName = hotel?.location?.name || hotel?.area || "Location";
  const hotelReviewRating =
    Number(hotel?.review?.rating ?? hotel?.rating ?? 0) || 0;
  const hotelReviewCount =
    Number(hotel?.review?.totalReviews ?? hotel?.reviewsCount ?? 0) || 0;
  const hotelAmenities = hotel?.facilitiesDetails
    ? Object.entries(hotel.facilitiesDetails).map(([category, items]) => ({
        category: category
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase()),
        items: Array.isArray(items) ? items : [],
      }))
    : Array.isArray(hotel?.amenities)
      ? hotel.amenities
      : [];

  const hotelReviews = Array.isArray(hotel?.reviews)
    ? hotel.reviews
    : hotel?.ratings?.reviews || [];

  const hotelReviewCategories = Array.isArray(hotel?.reviewCategories)
    ? hotel.reviewCategories
    : hotel?.ratings?.categories || [];
  const hotelPolicy = hotel?.policy || {};
  const nearbyPlaces = Array.isArray(hotel?.whatsNearby)
    ? hotel.whatsNearby
    : [];

  useEffect(() => {
    api
      .get(`/api/hotels/${id}`)
      .then((data) => {
        setHotel(data);
        setRooms(data.rooms || []);
      })
      .catch(() => navigate("/hotels"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

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
        <Helmet>
          <title>Hang Out Tourist - Hotel Details</title>
        </Helmet>
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
    (sum, r) => sum + (Number(r.effectivePrice ?? r.price ?? 0) || 0) * days,
    0,
  );
  const totalTaxesAndFees = selectedRooms.reduce(
    (sum, r) => sum + (Number(r.taxesAndFees) || 0) * days,
    0,
  );
  const grandTotal = totalPrice + totalTaxesAndFees;

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

  // Helper Calculations
  const calculateNights = () => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) || diffDays <= 0 ? 1 : diffDays;
  };

  const nights = calculateNights();

  // Action Handlers
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleToggleSave = () => {
    setIsSaved(!isSaved);
    showToast(!isSaved ? "Saved to your wishlist" : "Removed from wishlist");
  };

  const handleSearchUpdate = (e) => {
    e.preventDefault();
    showToast(`Updated search: ${nights} night(s), ${guests}`);
  };

  const handleProceedToCheckout = () => {
    if (!activeRoom) {
      showToast("Please select a room first");
      return;
    }
    setBookingLoading(true);
    setTimeout(() => {
      setBookingLoading(false);
      showToast(`Redirecting to payment for ${activeRoom.name}...`);
    }, 1200);
  };

  const filteredRooms = (hotel?.rooms || []).filter((room) => {
    if (activeFilter === "All") return true;
    return room.tags?.includes(activeFilter);
  });

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 font-sans pb-16 relative">
      <Navbar />
      {/* Toast Notification Bar */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Lightbox / Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setIsGalleryOpen(false)}
            className="absolute top-5 right-5 text-white hover:text-slate-300 p-2 rounded-full bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl w-full flex flex-col items-center">
            <img
              src={imgUrl(
                hotelImages[galleryIndex] ||
                  hotelImages[0] ||
                  hotel?.image ||
                  "",
              )}
              alt={hotel.name}
              className="max-h-[70vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="text-white text-base font-semibold mt-4">
              {hotel?.name || "Hotel Gallery"}
            </p>
            <div className="flex space-x-2 mt-4 overflow-x-auto max-w-full p-2">
              {hotelImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setGalleryIndex(idx)}
                  className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    galleryIndex === idx
                      ? "border-cyan-500 scale-105"
                      : "border-transparent opacity-60"
                  }`}
                >
                  <img
                    src={imgUrl(img)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-xs text-slate-500 flex items-center space-x-2">
        <a href="/" className="hover:text-slate-800">
          Home
        </a>
        <ChevronRight className="w-3 h-3" />
        <a href="/hotels" className="hover:text-slate-800">
          Hotels
        </a>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 font-medium">{hotel.name}</span>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Hotel Title Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500 mr-1" />
                {hotel.starRating || hotel.propertyType || "Hotel"}
              </span>
              <div className="flex text-amber-400">
                {(() => {
                  // Extracts the number from strings like "3star", "3 Star", "3", etc.
                  const starCount = parseInt(
                    String(hotel.starRating || "").match(/\d+/)?.[0] || "0",
                    10,
                  );

                  // If no numeric star count is found, fallback to review rating array
                  const count =
                    starCount > 0
                      ? starCount
                      : Math.round(hotelReviewRating || 0);

                  return [...Array(count)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ));
                })()}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {hotel.name}
            </h1>
            <p className="text-slate-500 text-sm flex items-center mt-1">
              <MapPin className="w-4 h-4 text-cyan-600 mr-1 shrink-0" />
              {hotelLocationName}
              {hotel?.location?.googleMapLink && (
                <a
                  href={hotel.location.googleMapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-600 font-semibold hover:underline ml-2"
                >
                  Show on Map
                </a>
              )}
            </p>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                title="Share Hotel"
                className="p-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleSave}
                title="Save to Wishlist"
                className={`p-2.5 rounded-full border border-slate-200 transition-colors cursor-pointer ${
                  isSaved
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${isSaved ? "fill-rose-600" : ""}`}
                />
              </button>
            </div>
            <div className="text-right border-l pl-6 border-slate-200">
              <div className="flex items-center justify-end space-x-2">
                <span className="bg-cyan-700 text-white font-bold text-sm px-2.5 py-1 rounded-lg">
                  {hotelReviewRating ? hotelReviewRating.toFixed(1) : "New"}
                </span>
                <div className="text-left">
                  <span className="text-xs font-bold block text-slate-900">
                    {hotelReviewRating >= 4.5
                      ? "Excellent"
                      : hotelReviewRating >= 4
                        ? "Very Good"
                        : "New Listing"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {hotelReviewCount} Reviews
                  </span>
                </div>
              </div>
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Price per night
                </p>
                {availableRooms.length > 0 ? (
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      ৳
                      {Math.min(
                        ...availableRooms.map(
                          (r) => r.effectivePrice ?? r.price ?? 0,
                        ),
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

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl overflow-hidden shadow-sm relative">
          <div
            onClick={() => {
              setGalleryIndex(0);
              setIsGalleryOpen(true);
            }}
            className="md:col-span-2 relative group cursor-pointer overflow-hidden h-[260px] md:h-[400px]"
          >
            <img
              src={imgUrl(hotelImages[0] || hotel?.image || "")}
              alt={hotel.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <span className="absolute bottom-3 left-3 bg-slate-900/70 backdrop-blur-md text-white text-xs font-medium px-3 py-1 rounded-full flex items-center">
              <Maximize2 className="w-3 h-3 mr-1.5" />
              {hotel.name}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:col-span-1">
            <div
              onClick={() => {
                setGalleryIndex(1);
                setIsGalleryOpen(true);
              }}
              className="relative group cursor-pointer overflow-hidden h-[125px] md:h-[194px]"
            >
              <img
                src={imgUrl(hotelImages[1] || hotelImages[0] || "")}
                alt={hotel.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div
              onClick={() => {
                setGalleryIndex(2);
                setIsGalleryOpen(true);
              }}
              className="relative group cursor-pointer overflow-hidden h-[125px] md:h-[194px]"
            >
              <img
                src={imgUrl(hotelImages[2] || hotelImages[0] || "")}
                alt={hotel.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:col-span-1">
            <div
              onClick={() => {
                setGalleryIndex(3);
                setIsGalleryOpen(true);
              }}
              className="relative group cursor-pointer overflow-hidden h-[125px] md:h-[194px]"
            >
              <img
                src={imgUrl(hotelImages[3] || hotelImages[0] || "")}
                alt={hotel.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div
              onClick={() => {
                setGalleryIndex(4);
                setIsGalleryOpen(true);
              }}
              className="relative group cursor-pointer overflow-hidden h-[125px] md:h-[194px]"
            >
              <img
                src={imgUrl(hotelImages[4] || hotelImages[0] || "")}
                alt={hotel.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <button
                type="button"
                className="absolute inset-0 bg-slate-900/40 hover:bg-slate-900/50 transition-colors text-white font-medium text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>View all Photos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-2 flex items-center space-x-8 text-sm font-medium text-slate-600 overflow-x-auto">
          <a
            href="#about"
            className="text-cyan-600 font-semibold border-b-2 border-cyan-600 py-2 whitespace-nowrap"
          >
            Overview
          </a>

          <a
            href="#reviews"
            className="hover:text-slate-900 py-2 whitespace-nowrap"
          >
            Reviews
          </a>

          <a
            href="#policies"
            className="hover:text-slate-900 py-2 whitespace-nowrap"
          >
            Hotel Policies
          </a>
        </div>

        {/* Search / Stay Modification Bar */}
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchUpdate?.(e);
              const roomsSection = document.getElementById("rooms-section");
              roomsSection?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center"
          >
            {/* Destination */}
            <div className="border border-slate-200 rounded-xl p-2.5 flex items-center space-x-3 bg-slate-50/50">
              <MapPin className="w-5 h-5 text-cyan-600 shrink-0" />
              <div className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Destination
                </span>
                <input
                  type="text"
                  defaultValue={hotel?.touristspot || hotelLocationName}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full"
                  disabled
                />
              </div>
            </div>

            <HotelDateRangePicker
              checkIn={checkIn}
              setCheckIn={setCheckIn}
              checkOut={checkOut}
              setCheckOut={setCheckOut}
            />

            {/* Search Action */}
            <div className="flex space-x-2 h-full">
              <Button
                type="submit"
                disabled={!checkIn || !checkOut}
                className="w-full h-full min-h-[42px] bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                <span>Search Rooms</span>
              </Button>
            </div>
          </form>

          {/* Night Count Indicator */}
          {days > 0 && (
            <div className="flex items-center">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 border border-green-200 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                {days} night{days > 1 ? "s" : ""} selected
              </p>
            </div>
          )}
        </div>

        {/* Content Layout: Main + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Hotel */}
            <section
              id="about"
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
            >
              <h2 className="text-lg font-bold text-slate-900 mb-3">
                About {hotel.name}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                {hotel.description}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(hotel.services || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 bg-cyan-50/50 border border-cyan-100 p-2.5 rounded-xl text-xs font-medium text-slate-700"
                  >
                    <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              {nearbyPlaces.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    What&apos;s Nearby
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {nearbyPlaces.map((place, idx) => (
                      <span
                        key={`${place}-${idx}`}
                        className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        {place}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Select Your Room */}
            <section id="rooms-section" className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Select Your Room
                </h2>
                <p className="text-xs text-slate-500">
                  {days > 0
                    ? `Prices calculated for ${days} night(s)`
                    : "Select check-in and check-out dates to view room pricing"}
                </p>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 gap-5">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-64 rounded-2xl bg-slate-100 animate-pulse border border-slate-200"
                    />
                  ))}
                </div>
              ) : availableRooms.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-dashed border-slate-200">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium">
                    {searched
                      ? "No rooms available for the selected dates."
                      : "Please select dates to view available rooms."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
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
                        effectivePrice={room.effectivePrice ?? room.price ?? 0}
                        priceData={{
                          hasDiscount: Number(room.discountPercentage || 0) > 0,
                          discountPercentage: Number(
                            room.discountPercentage || 0,
                          ),
                          original: Number(room.basePrice ?? room.price ?? 0),
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Property Amenities */}
            <section
              id="amenities"
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4"
            >
              <h2 className="text-lg font-bold text-slate-900">
                Property Amenities & Facilities
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {hotelAmenities.length > 0 ? (
                  hotelAmenities.map((cat, idx) => (
                    <div key={idx} className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {cat.category}
                      </h3>
                      <ul className="space-y-2 text-xs text-slate-700 font-medium">
                        {(cat.items || []).map((item, i) => (
                          <li key={i} className="flex items-center space-x-2">
                            <CheckCircle className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500 col-span-full">
                    No facilities details are available for this property yet.
                  </div>
                )}
              </div>
            </section>

            {/* Guest Ratings & Reviews */}
            <section
              id="reviews"
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Guest Ratings & Reviews
                  </h2>
                  <p className="text-xs text-slate-500">
                    Based on verified guest stay feedback
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-cyan-700">
                    {hotelReviewRating ? hotelReviewRating.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold block">
                    {hotelReviewRating >= 4.5
                      ? "Overall Excellent"
                      : hotelReviewRating >= 4
                        ? "Very Good"
                        : "New Listing"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hotelReviewCategories.length > 0 ? (
                  hotelReviewCategories.map((cat, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-600">{cat.label}</span>
                        <span className="font-bold text-slate-900">
                          {cat.score} / 5
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-cyan-600 h-full rounded-full"
                          style={{ width: `${(cat.score / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500 col-span-full">
                    Review scores will appear once guest feedback is added.
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                {hotelReviews.length > 0 ? (
                  hotelReviews.map((rev, i) => (
                    <div
                      key={i}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900">
                          {rev.author || "Guest"}
                        </span>
                        <span className="text-slate-400">
                          {rev.date || "Recent"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic">
                        "
                        {rev.text || rev.comment || "Review text not provided."}
                        "
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-500">
                    Early guest reviews will appear here soon.
                  </div>
                )}
              </div>
            </section>

            {/* Hotel Policies */}
            <section
              id="policies"
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4"
            >
              <h2 className="text-lg font-bold text-slate-900">
                Hotel Policies & Important Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <PolicyItem
                  icon={Clock}
                  title="Check-in & Check-out Times"
                  description={`Check-in from ${hotel?.checkIn || hotelPolicy.checkIn || "Not provided"}. Check-out until ${hotel?.checkOut || hotelPolicy.checkOut || "Not provided"}.`}
                />
                <PolicyItem
                  icon={ShieldCheck}
                  title="Cancellation Policy"
                  description={
                    hotelPolicy.cancellationPolicyForCorporateGroupBookings ||
                    hotelPolicy.blackoutCancellationPolicy ||
                    "Not provided."
                  }
                />
                <PolicyItem
                  icon={Users}
                  title="Child & Extra Bed Policy"
                  description={
                    hotelPolicy.childPolicy ||
                    hotelPolicy.extraBedAndBreakfastPolicy ||
                    "Not provided."
                  }
                />
                <PolicyItem
                  icon={Info}
                  title="Identification Requirements"
                  description={
                    hotelPolicy.identificationRequirement ||
                    hotelPolicy.instructions ||
                    "Not provided."
                  }
                />
                {hotelPolicy.petPolicy && (
                  <PolicyItem
                    icon={Info}
                    title="Pet Policy"
                    description={hotelPolicy.petPolicy}
                  />
                )}
                {hotelPolicy.hygieneAndSafetyPolicies?.length > 0 && (
                  <PolicyItem
                    icon={ShieldCheck}
                    title="Hygiene & Safety"
                    description={hotelPolicy.hygieneAndSafetyPolicies.join(
                      ", ",
                    )}
                  />
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Column: Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Booking Summary Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider block">
                    Booking Summary
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedRooms.length > 0
                      ? `${selectedRooms.length} Room${selectedRooms.length > 1 ? "s" : ""} Selected`
                      : "No Rooms Selected"}
                  </h3>
                  {days > 0 && checkIn && checkOut && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
                      {new Date(checkIn).toLocaleDateString("en-GB")} to{" "}
                      {new Date(checkOut).toLocaleDateString("en-GB")} ({days}{" "}
                      {days > 1 ? "Nights" : "Night"})
                    </p>
                  )}
                </div>

                {/* Date & Room Details */}
                {days > 0 ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Check-in:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(checkIn).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Check-out:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(checkOut).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 pb-2 border-b border-slate-100">
                      <span>Duration:</span>
                      <span className="font-semibold text-slate-900">
                        {days} night{days > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Selected Rooms:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedRooms.length}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Select check-in and check-out dates to view pricing details
                  </p>
                )}

                {/* Pricing Breakdown */}
                {selectedRooms.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Room price</span>
                        <span className="font-semibold text-slate-900">
                          ৳{totalPrice.toLocaleString("en-BD")}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Taxes &amp; fees</span>
                        <span className="font-semibold text-slate-900">
                          ৳{totalTaxesAndFees.toLocaleString("en-BD")}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-slate-200 pt-2">
                        <span className="text-sm font-bold text-slate-900">
                          Total
                        </span>
                        <span className="text-xl font-extrabold text-cyan-700">
                          ৳{grandTotal.toLocaleString("en-BD")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Includes taxes and fees for {days} night
                        {days > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                )}

                {/* Instant Book CTA */}
                <button
                  onClick={handleProceed}
                  disabled={
                    selectedRooms.length === 0 ||
                    !checkIn ||
                    !checkOut ||
                    bookingLoading
                  }
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? (
                    <span className="text-xs">Processing Reservation...</span>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>
                        {selectedRooms.length > 0
                          ? `Book ${selectedRooms.length} Room${selectedRooms.length > 1 ? "s" : ""}`
                          : "Select Rooms"}
                      </span>
                    </>
                  )}
                </button>

                {hotel?.policy?.instructions && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start space-x-2 text-[11px] text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{hotel.policy.instructions}</span>
                  </div>
                )}
              </div>

              {/* Support & Location Info Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                {(hotel?.phone || hotel?.contactNumber) && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Support
                      </p>
                      <p className="font-semibold text-slate-800 text-xs">
                        {hotel.phone || hotel.contactNumber}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 pt-2.5 border-t border-slate-100">
                  <MapPin className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Location
                    </p>
                    <p className="font-semibold text-slate-800 text-xs">
                      {hotelLocationName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ==========================================================================
   COMPONENT 2: RoomCard
   ========================================================================== */
export function RoomCard({
  room = {},
  isSelected,
  isBooked,
  days,
  checkIn,
  checkOut,
  onToggle,
  idx,
  priceData = {},
  effectivePrice = 0,
  formatBDTPrice = (val) => `৳${Number(val || 0).toLocaleString("en-BD")}`,
}) {
  const [currentImg, setCurrentImg] = useState(0);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const imagesList =
    room.images?.length > 0 ? room.images : room.image ? [room.image] : [];
  const roomFacilityEntries =
    room.facilities && typeof room.facilities === "object"
      ? Object.entries(room.facilities).filter(
          ([, items]) => Array.isArray(items) && items.length > 0,
        )
      : [];
  const roomRate = (Number(effectivePrice) || 0) * days;
  const roomTaxes = (Number(room.taxesAndFees) || 0) * days;

  return (
    <>
      <div
        className={`bg-white rounded-3xl border transition-all overflow-hidden ${
          isBooked
            ? "border-red-200 opacity-70 bg-slate-50"
            : isSelected
              ? "border-teal-600 ring-2 ring-teal-600/10 shadow-lg"
              : "border-slate-200/80 shadow-sm hover:shadow-md"
        }`}
        style={{ animationDelay: `${idx * 0.06}s` }}
      >
        <div className="flex min-h-[320px] flex-col md:flex-row">
          {/* Left Column */}
          <div className="flex min-w-0 flex-1 flex-col justify-between border-b border-slate-100 p-4 sm:p-6 md:border-b-0 md:border-r">
            <div>
              {/* Room Image Carousel */}
              <div
                onClick={() => imagesList.length > 0 && setShowPhotoModal(true)}
                className="h-56 rounded-2xl overflow-hidden relative shrink-0 bg-slate-100 mb-5 cursor-pointer group"
              >
                {imagesList.length > 0 ? (
                  <>
                    <img
                      src={imgUrl(imagesList[currentImg])}
                      alt={room.roomCategory || room.name || "Room image"}
                      className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                        <Maximize className="w-3.5 h-3.5" /> View Photos
                      </span>
                    </div>

                    {imagesList.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImg(
                              (p) =>
                                (p - 1 + imagesList.length) % imagesList.length,
                            );
                          }}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImg((p) => (p + 1) % imagesList.length);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">
                    🛏️
                  </div>
                )}

                {/* Status Badges */}
                {isBooked ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px] z-10">
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                      Not Available
                    </span>
                  </div>
                ) : room.tag ? (
                  <span className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
                    {room.tag}
                  </span>
                ) : null}
              </div>

              <h3 className="break-words text-xl font-bold tracking-tight text-slate-900">
                {room.roomCategory || room.name || "Room details"}
              </h3>
              <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">
                {room.description || "Room description not provided."}
              </p>

              {/* Room Highlights */}
              <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2.5 text-xs font-medium text-slate-600 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="min-w-0 break-words">
                    {room.bedType || "Not provided"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="min-w-0 break-words">
                    {room.maximumGuestsAllowed || room.maxGuests
                      ? `Max ${room.maximumGuestsAllowed || room.maxGuests} Guests`
                      : "Occupancy not provided"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="min-w-0 break-words">
                    {room.roomSize || room.size || "Not provided"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="min-w-0 break-words">
                    {room.roomView || room.view || "Not provided"}
                  </span>
                </div>
              </div>
            </div>

            {/* Room Details Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 mt-4 transition-colors w-fit"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Room details </span>
            </button>
          </div>

          {/* Right Column */}
          <div className="flex min-w-0 flex-1 flex-col justify-between bg-slate-50/30 p-4 sm:p-6">
            <div>
              <div className="mb-5 border-b border-slate-200 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    ROOM PRICE
                  </span>
                  {priceData.hasDiscount && (
                    <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">
                      {priceData.discountPercentage}% OFF
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  {priceData.hasDiscount && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatBDTPrice(priceData.original)}
                    </span>
                  )}
                  <span className="text-2xl font-bold text-teal-700">
                    {formatBDTPrice(effectivePrice)}
                  </span>
                  <span className="text-xs text-slate-500">/ night</span>
                </div>
                {days > 0 && (
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>
                        {days} night{days > 1 ? "s" : ""}
                      </span>
                      <span>{formatBDTPrice(roomRate)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Taxes &amp; fees</span>
                      <span>{formatBDTPrice(roomTaxes)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900">
                      <span>Total</span>
                      <span>{formatBDTPrice(roomRate + roomTaxes)}</span>
                    </div>
                  </div>
                )}
              </div>

              <ul className="space-y-3">
                {(Array.isArray(room.services) ? room.services : []).map(
                  (inc, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 text-xs font-medium text-slate-700"
                    >
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                      <span className="min-w-0 break-words">{inc}</span>
                    </li>
                  ),
                )}
                {(!Array.isArray(room.services) ||
                  room.services.length === 0) && (
                  <li className="text-xs text-slate-500">
                    No included services provided.
                  </li>
                )}

                {Array.isArray(room.restrictions) &&
                  room.restrictions.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 text-xs font-medium text-slate-500"
                    >
                      <Ban className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-col items-stretch gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-end sm:justify-between">
              <button
                type="button"
                onClick={() => onToggle(room)}
                disabled={isBooked}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors ${
                  isBooked
                    ? "cursor-not-allowed bg-slate-200 text-slate-500"
                    : isSelected
                      ? "bg-teal-100 text-teal-800 hover:bg-teal-200"
                      : "bg-teal-600 text-white hover:bg-teal-700"
                }`}
              >
                {isBooked ? "Booked" : isSelected ? "Selected" : "Select Room"}
                {!isBooked && checkIn && checkOut && !isSelected && (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- ROOM DETAILS MODAL ---------------- */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden relative animate-in fade-in zoom-in-95 my-8">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-indigo-950">
                Room Details
              </h2>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-slate-700">
              {/* Title & Specs Header */}
              <div>
                <h3 className="text-xl font-bold text-indigo-950">
                  {room.roomCategory || room.name || "Room details"}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4" />
                    {room.bedType || "Not provided"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {room.guestsText ||
                      (room.adultOccupancy != null
                        ? `${room.adultOccupancy} Adults, ${room.complementaryChildOccupancy ?? 0} Child`
                        : "Occupancy not provided")}
                  </span>
                </div>
              </div>

              {/* Occupancy Info */}
              <div className="grid grid-cols-2 gap-y-2 py-4 border-y border-slate-100 text-xs font-medium">
                <div>
                  <span className="text-slate-900 font-bold">
                    Adult Occupancy:{" "}
                  </span>
                  <span className="text-slate-600">
                    {room.adultOccupancy || 2}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 font-bold">
                    Complementary Child Occupancy:{" "}
                  </span>
                  <span className="text-slate-600">
                    {room.complementaryChildOccupancy ?? "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 font-bold">
                    On Demand Extra Bed:{" "}
                  </span>
                  <span className="text-slate-600">
                    {room.onDemandExtraBed ?? "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 font-bold">
                    Maximum Number of Guests Allowed:{" "}
                  </span>
                  <span className="text-slate-600">
                    {room.maximumGuestsAllowed ?? "Not provided"}
                  </span>
                </div>
              </div>

              {/* Room Meta Attributes */}
              <div className="grid grid-cols-2 gap-y-2 py-2 border-b border-slate-100 text-xs font-medium">
                <div>
                  <span className="text-slate-900 font-bold">Room Type : </span>
                  <span className="text-slate-600">
                    {room.roomType || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 font-bold">
                    Smoking Policy :{" "}
                  </span>
                  <span className="text-slate-900 font-bold">
                    {room.smokingPolicy || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 font-bold">
                    Room Characteristics :{" "}
                  </span>
                  <span className="text-slate-600">
                    {Array.isArray(room.roomCharacteristics)
                      ? room.roomCharacteristics.join(", ") || "Not provided"
                      : room.characteristics || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 font-bold">Room Size : </span>
                  <span className="text-slate-600">
                    {room.roomSize || room.size || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 font-bold">Room View : </span>
                  <span className="text-slate-600">
                    {room.roomView || room.view || "Not provided"}
                  </span>
                </div>
              </div>

              {/* Facilities Section */}
              <div>
                <h4 className="text-lg font-bold text-indigo-950 mb-4">
                  Facilities
                </h4>

                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                  {roomFacilityEntries.length > 0 ? (
                    roomFacilityEntries.map(([category, items]) => (
                      <div key={category}>
                        <h5 className="font-bold text-xs text-indigo-950 mb-2">
                          {category
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (value) => value.toUpperCase())}
                        </h5>
                        <ul className="space-y-1 text-xs text-slate-500 font-medium">
                          {items.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">
                      Facilities not provided.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PHOTO GALLERY LIGHTBOX MODAL ---------------- */}
      {showPhotoModal && imagesList.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <button
            type="button"
            onClick={() => setShowPhotoModal(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors z-20"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative w-full max-w-4xl h-[75vh] flex items-center justify-center">
            <img
              src={imgUrl(imagesList[currentImg])}
              alt="Room preview full view"
              className="max-w-full max-h-full object-contain rounded-xl"
            />

            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                  onClick={() =>
                    setCurrentImg(
                      (p) => (p - 1 + imagesList.length) % imagesList.length,
                    )
                  }
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                  onClick={() =>
                    setCurrentImg((p) => (p + 1) % imagesList.length)
                  }
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
              {currentImg + 1} / {imagesList.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ==========================================================================
   COMPONENT 3: PolicyItem
   ========================================================================== */
export function PolicyItem({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start space-x-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
      <div className="p-2 bg-white rounded-lg border border-slate-200 text-cyan-700 shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h4 className="font-bold text-slate-900 text-xs mb-0.5">{title}</h4>
        <p className="text-slate-500 text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
