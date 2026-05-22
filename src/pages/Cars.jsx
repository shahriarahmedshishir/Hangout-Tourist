import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Fuel,
  Settings2,
  Car,
  BusFront,
  Plane,
  ChevronLeft,
  ChevronRight,
  Truck,
  Route,
  Landmark,
  Info,
  Clock,
} from "lucide-react";
import { api, imgUrl } from "@/lib/api";

const COXS_BAZAR_TRANSPORTS = [
  {
    title: "Chander Gari",
    icon: <Truck className="h-8 w-8 text-primary" />,
    description:
      "The unique jeep better known as Chander Gari for hilly tracks.",
    routes: [
      { from: "Cox's Bazar", to: "Himchhari", price: 800 },
      { from: "Cox's Bazar", to: "Inani", price: 1200 },
      { from: "Cox's Bazar", to: "Ramu", price: 1000 },
    ],
    features: [
      "Suitable for off-roading",
      "Seats 8-10 passengers",
      "Experienced local drivers",
    ],
    image: "/images/chander-gari.jpg", // Replace with real image or path
  },
  {
    title: "Micro Bus",
    icon: <Car className="h-8 w-8 text-primary" />,
    description:
      "Comfortable travel for families or groups in and around Cox’s Bazar.",
    routes: [
      { from: "Cox's Bazar", to: "Laboni", price: 700 },
      { from: "Cox's Bazar", to: "Marine Drive", price: 1200 },
      { from: "Cox's Bazar", to: "Teknaf", price: 2200 },
    ],
    features: [
      "Air Conditioned",
      "Seats 12-14 passengers",
      "Safe and reliable",
    ],
    image: "/images/micro-bus.jpg", // Replace with real image or path
  },
];

const Cars = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  // Main cars data
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const [activeImg, setActiveImg] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Bus data and loading state
  const [buses, setBuses] = useState([]);
  const [busesLoading, setBusesLoading] = useState(false);

  // Cox's Bazar data and loading state
  const [coxsBazarServices, setCoxsBazarServices] = useState([]);
  const [coxsBazarLoading, setCoxsBazarLoading] = useState(false);

  // UI state for option switching
  const [selectedTab, setSelectedTab] = useState("car"); // car | bus | coxs_bazar
  const [selectedCoxsBazar, setSelectedCoxsBazar] = useState(null); // null | "Chander Gari" | "Micro Bus"

  // Car Rent
  const handleRentNow = (car) => {
    if (!user) {
      toast({
        title: "Please Login First",
        description: "You need to log in before you can rent a car.",
        duration: 3000,
      });
      setTimeout(() => {
        navigate("/login");
      }, 500);
      return;
    }
    navigate("/booking/car", {
      state: { car },
    });
  };

  // Bus booking - you may connect this to your actual booking logic
  const handleBusBookNow = (bus) => {
    if (!user) {
      toast({
        title: "Please Login First",
        description: "You need to log in before you can book a bus.",
        duration: 3000,
      });
      setTimeout(() => {
        navigate("/login");
      }, 500);
      return;
    }
    navigate("/booking/bus", {
      state: { bus },
    });
  };

  // Fetch car data
  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === "hotel_staff") {
        navigate("/staff", { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Initialize search from query param if present
    try {
      const params = new URLSearchParams(location.search);
      const q = params.get("q");
      if (q) setSearch(q);
    } catch (err) {}
    if (selectedTab === "car") {
      setLoading(true);
      api
        .get("/api/cars")
        .then((data) => setCars(data))
        .catch(() => setCars([]))
        .finally(() => setLoading(false));
    }
  }, [selectedTab]);

  useEffect(() => {
    if (selectedTab === "bus") {
      setBusesLoading(true);
      api
        .get("/api/buses")
        .then((data) => setBuses(data))
        .catch(() => setBuses([]))
        .finally(() => setBusesLoading(false));
    }
  }, [selectedTab]);

  useEffect(() => {
    if (selectedTab === "coxs_bazar") {
      setCoxsBazarLoading(true);
      api
        .get("/api/carrent")
        .then((data) => setCoxsBazarServices(data))
        .catch(() => setCoxsBazarServices([]))
        .finally(() => setCoxsBazarLoading(false));
    }
  }, [selectedTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTab]);

  // Filtering for cars tab
  const filtered = cars.filter((car) => {
    const normalize = (s = "") =>
      String(s)
        .toLowerCase()
        .replace(/[\u2018\u2019'`’]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const ns = normalize(search);
    if (!ns) return true;
    if (normalize(car.name || "").includes(ns)) return true;
    if (normalize(car.type || "").includes(ns)) return true;
    if (car.places?.some((p) => normalize(p || "").includes(ns))) return true;
    return false;
  });
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedCars = filtered.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Option Selection */}
      <div className="bg-gradient-primary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-primary-foreground md:text-3xl">
            Rent Your Ride
          </h1>
          <p className="text-primary-foreground/80">
            Choose from different options for your comfort and convenience
          </p>
          <div className="mt-6 flex flex-wrap gap-5 justify-center">
            <Button
              size="lg"
              className={
                selectedTab === "car"
                  ? "bg-white text-primary"
                  : "bg-card border shadow hover:bg-secondary"
              }
              variant={selectedTab === "car" ? "default" : "outline"}
              onClick={() => {
                setSelectedTab("car");
                setSelectedCoxsBazar(null);
                setSearch("");
              }}
            >
              <Car className="mr-2 h-5 w-5" /> Car Rental
            </Button>
            <Button
              size="lg"
              className={
                selectedTab === "bus"
                  ? "bg-white text-primary"
                  : "bg-card border shadow hover:bg-secondary"
              }
              variant={selectedTab === "bus" ? "default" : "outline"}
              onClick={() => {
                setSelectedTab("bus");
                setSelectedCoxsBazar(null);
                setSearch("");
              }}
            >
              <BusFront className="mr-2 h-5 w-5" /> Bus Service
            </Button>
            <Button
              size="lg"
              className={
                selectedTab === "coxs_bazar"
                  ? "bg-white text-primary"
                  : "bg-card border shadow hover:bg-secondary"
              }
              variant={selectedTab === "coxs_bazar" ? "default" : "outline"}
              onClick={() => {
                setSelectedTab("coxs_bazar");
                setSelectedCoxsBazar(null);
                setSearch("");
              }}
            >
              <Landmark className="mr-2 h-5 w-5" /> Cox's Bazar Special
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Cars Tab */}
        {selectedTab === "car" && (
          <>
            {/* Search */}
            <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Search by place or car name
                  </label>
                  <Input
                    placeholder="e.g. Dhaka, Sedan, Toyota..."
                    className="bg-muted"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button className="bg-gradient-primary text-primary-foreground">
                    Search
                  </Button>
                </div>
              </div>
            </div>
            {/* Car Grid - same as original */}
            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-card p-5 shadow-card animate-pulse"
                  >
                    <div className="mb-4 h-28 rounded-xl bg-muted" />
                    <div className="mb-2 h-5 w-3/4 rounded bg-muted" />
                    <div className="mb-4 h-4 w-1/3 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                <Car className="h-14 w-14 opacity-30" />
                <p className="text-lg font-medium">No cars available</p>
                <p className="text-sm">Check back later or contact us.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  {filtered.length} cars found (Showing {startIdx + 1}-
                  {Math.min(startIdx + itemsPerPage, filtered.length)})
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedCars.map((car, i) => (
                    <div
                      key={car._id}
                      className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1 animate-fade-in"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="mb-4 flex h-44 items-center justify-center rounded-xl bg-muted overflow-hidden relative">
                        {car.images?.length > 0 ? (
                          <>
                            <img
                              src={imgUrl(car.images[activeImg[car._id] || 0])}
                              alt={car.name}
                              className="h-full w-full object-cover"
                            />
                            {car.images.length > 1 && (
                              <>
                                <button
                                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveImg((p) => ({
                                      ...p,
                                      [car._id]:
                                        ((p[car._id] || 0) -
                                          1 +
                                          car.images.length) %
                                        car.images.length,
                                    }));
                                  }}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </button>
                                <button
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveImg((p) => ({
                                      ...p,
                                      [car._id]:
                                        ((p[car._id] || 0) + 1) %
                                        car.images.length,
                                    }));
                                  }}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                  {car.images.map((_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveImg((p) => ({
                                          ...p,
                                          [car._id]: idx,
                                        }));
                                      }}
                                      className={`h-1.5 w-1.5 rounded-full transition-all ${
                                        idx === (activeImg[car._id] || 0)
                                          ? "bg-white scale-125"
                                          : "bg-white/50"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <Car className="h-12 w-12 text-muted-foreground opacity-50" />
                        )}
                      </div>
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {car.name}
                      </h3>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {car.type === "CC" ? "🚗 CC" : "🏎️ MC"}
                        </span>
                      </div>
                      {car.places?.length > 0 && (
                        <p className="mb-3 text-xs text-primary">
                          📍 {car.places.join(" · ")}
                        </p>
                      )}
                      <div className="mb-4 flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {car.seats} seats
                        </span>
                        <span className="flex items-center gap-1">
                          <Settings2 className="h-3 w-3" /> {car.transmission}
                        </span>
                        <span className="flex items-center gap-1">
                          <Fuel className="h-3 w-3" /> {car.fuel}
                        </span>
                      </div>
                      <div className="flex items-end justify-between border-t border-border pt-3">
                        <div>
                          <span className="font-heading text-xl font-bold text-primary">
                            ৳{car.price?.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {" "}
                            /day
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-gradient-primary text-primary-foreground"
                          onClick={() => handleRentNow(car)}
                        >
                          Rent Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      onClick={() => {
                        setCurrentPage(Math.max(1, currentPage - 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      disabled={currentPage === 1}
                      size="sm"
                      variant="outline"
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                onClick={() => {
                                  setCurrentPage(page);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }}
                                size="sm"
                                variant={
                                  currentPage === page ? "default" : "outline"
                                }
                                className={
                                  currentPage === page
                                    ? "bg-gradient-primary text-primary-foreground"
                                    : ""
                                }
                              >
                                {page}
                              </Button>
                            );
                          } else if (page === 2 || page === totalPages - 1) {
                            return (
                              <span
                                key={`ellipsis-${page}`}
                                className="px-2 text-muted-foreground"
                              >
                                ...
                              </span>
                            );
                          }
                          return null;
                        },
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setCurrentPage(Math.min(totalPages, currentPage + 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      disabled={currentPage === totalPages}
                      size="sm"
                      variant="outline"
                      className="gap-1"
                    >
                      Forward
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Bus Tab */}
        {selectedTab === "bus" && (
          <>
            <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card text-center">
              <BusFront className="mx-auto my-2 h-8 w-8 text-primary" />
              <div className="text-lg font-bold">Available Bus Services</div>
              <div className="text-muted-foreground text-sm mb-2">
                View all buses operating on various routes.
              </div>
            </div>
            {busesLoading ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border bg-card p-6 shadow-card animate-pulse"
                  >
                    <div className="mb-3 h-8 w-24 rounded bg-muted mx-auto" />
                    <div className="mb-2 h-5 w-3/4 rounded bg-muted mx-auto" />
                    <div className="mb-4 h-4 w-1/2 rounded bg-muted mx-auto" />
                  </div>
                ))}
              </div>
            ) : buses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                <BusFront className="h-14 w-14 opacity-30" />
                <p className="text-lg font-medium">No buses available</p>
                <p className="text-sm">Check back later or contact us.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {buses.map((bus, i) => (
                  <div
                    key={bus._id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1 animate-fade-in"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="mb-4 flex h-44 items-center justify-center rounded-xl bg-muted overflow-hidden relative">
                      {bus.images?.length > 0 ? (
                        <>
                          <img
                            src={imgUrl(bus.images[activeImg[bus._id] || 0])}
                            alt={bus.name}
                            className="h-full w-full object-cover"
                          />
                          {bus.images.length > 1 && (
                            <>
                              <button
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImg((p) => ({
                                    ...p,
                                    [bus._id]:
                                      ((p[bus._id] || 0) -
                                        1 +
                                        bus.images.length) %
                                      bus.images.length,
                                  }));
                                }}
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </button>
                              <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImg((p) => ({
                                    ...p,
                                    [bus._id]:
                                      ((p[bus._id] || 0) + 1) %
                                      bus.images.length,
                                  }));
                                }}
                              >
                                <ChevronRight className="h-3 w-3" />
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {bus.images.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveImg((p) => ({
                                        ...p,
                                        [bus._id]: idx,
                                      }));
                                    }}
                                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                                      idx === (activeImg[bus._id] || 0)
                                        ? "bg-white scale-125"
                                        : "bg-white/50"
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <BusFront className="h-12 w-12 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {bus.name}
                    </h3>
                    <p className="mb-1 text-xs text-muted-foreground">
                      {bus.busType}
                    </p>
                    {bus.routes?.length > 0 && (
                      <p className="mb-3 text-xs text-primary">
                        📍 {bus.routes.join(" • ")}
                      </p>
                    )}
                    <div className="mb-4 flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {bus.seats} seats
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {bus.departureTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Settings2 className="h-3 w-3" /> {bus.acType}
                      </span>
                    </div>
                    <div className="flex items-end justify-between border-t border-border pt-3">
                      <div>
                        <span className="font-heading text-xl font-bold text-primary">
                          ৳{bus.price?.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {" "}
                          /seat
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-gradient-primary text-primary-foreground"
                        onClick={() => handleBusBookNow(bus)}
                        disabled={(bus.availableSeats || 0) === 0}
                      >
                        {(bus.availableSeats || 0) > 0
                          ? "Book Now"
                          : "Unavailable"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Cox's Bazar Tab */}
        {selectedTab === "coxs_bazar" && (
          <>
            {coxsBazarLoading ? (
              <div className="text-center text-muted-foreground">
                Loading Cox's Bazar services...
              </div>
            ) : coxsBazarServices.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                No Cox's Bazar services available at the moment.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {coxsBazarServices.map((service) => (
                  <div
                    key={service._id}
                    className="rounded-2xl border border-border bg-card overflow-hidden shadow-card hover:shadow-lg transition-shadow"
                  >
                    {service.images?.[0] && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={imgUrl(
                            service.images[activeImg[service._id] || 0] ||
                              service.images[0],
                          )}
                          alt={service.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {service.name}
                      </h3>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {service.type || "Standard"}
                        </span>
                      </div>
                      <div className="mb-4 flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Fuel className="h-3 w-3" />{" "}
                          {service.fuel || "Petrol"}
                        </span>
                      </div>
                      <div className="flex items-end justify-between border-t border-border pt-3">
                        <div>
                          <span className="font-heading text-xl font-bold text-primary">
                            ৳{service.price?.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {" "}
                            /seat
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-gradient-primary text-primary-foreground"
                          onClick={() => {
                            if (!user) {
                              toast({
                                title: "Please Login First",
                                description:
                                  "You need to log in before booking.",
                                duration: 3000,
                              });
                              setTimeout(() => navigate("/login"), 500);
                              return;
                            }
                            navigate("/booking/coxs-bazar", {
                              state: { service },
                            });
                          }}
                          disabled={(service.availableCars || 0) === 0}
                        >
                          {(service.availableCars || 0) > 0
                            ? "Book Now"
                            : "Unavailable"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Cars;
