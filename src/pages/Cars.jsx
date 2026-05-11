import { useState, useEffect } from "react";
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
} from "lucide-react";
import { api, imgUrl } from "@/lib/api";

const COXS_BAZAR_TRANSPORTS = [
  {
    title: "Chander Gari",
    icon: <Truck className="h-8 w-8 text-primary" />,
    description: "The unique jeep better known as Chander Gari for hilly tracks.",
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
    description: "Comfortable travel for families or groups in and around Cox’s Bazar.",
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
  const [activeImg, setActiveImg] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Bus data and loading state
  const [buses, setBuses] = useState([]);
  const [busesLoading, setBusesLoading] = useState(false);

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
    if (selectedTab === "car") {
      setLoading(true);
      api
        .get("/api/carrent")
        .then((data) => setCars(data))
        .catch(() => setCars([]))
        .finally(() => setLoading(false));
    }
  }, [selectedTab]);

  useEffect(() => {
    if (selectedTab === "bus") {
      setBusesLoading(true);
      api
        .get("/api/busrent")
        .then((data) => setBuses(data))
        .catch(() => setBuses([]))
        .finally(() => setBusesLoading(false));
    }
  }, [selectedTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTab]);

  // Filtering for cars tab
  const filtered = cars.filter(
    (car) =>
      !search ||
      car.name?.toLowerCase().includes(search.toLowerCase()) ||
      car.type?.toLowerCase().includes(search.toLowerCase()) ||
      car.places?.some((p) => p.toLowerCase().includes(search.toLowerCase()))
  );
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
              className={selectedTab === "car" ? "bg-white text-primary" : "bg-card border shadow hover:bg-secondary"}
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
              className={selectedTab === "bus" ? "bg-white text-primary" : "bg-card border shadow hover:bg-secondary"}
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
              className={selectedTab === "coxs_bazar" ? "bg-white text-primary" : "bg-card border shadow hover:bg-secondary"}
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
                      <p className="mb-1 text-xs text-muted-foreground">
                        {car.type}
                      </p>
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
                        }
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
              <div className="text-muted-foreground text-sm mb-2">View all buses operating on various routes.</div>
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
                {buses.map((bus) => (
                  <div
                    key={bus._id}
                    className="rounded-xl border border-border bg-card p-6 shadow-card flex flex-col justify-between hover:-translate-y-1 transition-transform"
                  >
                    <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
                      <BusFront className="text-primary" />
                      <span className="font-semibold text-lg">{bus.name}</span>
                    </div>
                    <div className="mb-2 text-muted-foreground flex items-center gap-2">
                      <Route className="h-4 w-4" /> {bus.route}
                    </div>
                    <div className="mb-1 text-xs text-muted-foreground">
                      {bus.features?.join(", ")}
                    </div>
                    <div className="flex items-center justify-between mt-3 border-t border-border pt-2">
                      <div>
                        <span className="font-heading text-xl font-bold text-primary">
                          ৳{bus.price?.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground"> /trip</span>
                      </div>
                      <Button size="sm"
                        className="bg-gradient-primary text-primary-foreground"
                        onClick={() => handleBusBookNow(bus)}
                      >
                        Book Now
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
            {!selectedCoxsBazar ? (
              <>
                <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card text-center">
                  <Landmark className="mx-auto my-2 h-8 w-8 text-primary" />
                  <div className="text-lg font-bold">Cox's Bazar Special Transportation</div>
                  <div className="text-muted-foreground text-sm mb-2">
                    Explore Cox’s Bazar with local transports. Select an option below:
                  </div>
                </div>
                <div className="grid gap-7 md:grid-cols-2">
                  {COXS_BAZAR_TRANSPORTS.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-border bg-card p-8 shadow-card flex flex-col items-center cursor-pointer hover:border-primary hover:bg-secondary/30 transition"
                      onClick={() => setSelectedCoxsBazar(item.title)}
                    >
                      {item.icon}
                      <div className="mt-3 font-heading text-lg font-bold">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-4"
                  onClick={() => setSelectedCoxsBazar(null)}
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                {COXS_BAZAR_TRANSPORTS.filter((t) => t.title === selectedCoxsBazar).map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border bg-card p-8 shadow-card flex flex-col md:flex-row md:items-stretch gap-8"
                  >
                    <div className="flex-shrink-0 w-full md:w-1/3 flex flex-col items-center">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="rounded-lg w-full h-36 object-cover mb-4"
                      />
                      {item.icon}
                      <div className="font-heading text-lg font-bold mt-3">
                        {item.title}
                      </div>
                      <div className="text-muted-foreground text-sm">{item.description}</div>
                    </div>
                    <div className="flex-grow">
                      <div className="mb-2 font-semibold">
                        <Route className="inline-block h-5 w-5 mr-1" />
                        Route-wise Price List
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-t border-border">
                          <thead>
                            <tr>
                              <th className="py-2 px-3 font-medium text-muted-foreground">From</th>
                              <th className="py-2 px-3 font-medium text-muted-foreground">To</th>
                              <th className="py-2 px-3 font-medium text-muted-foreground">Price (৳)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.routes.map((r, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3">{r.from}</td>
                                <td className="py-2 px-3">{r.to}</td>
                                <td className="py-2 px-3">{r.price.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4">
                        <div className="font-semibold mb-1">
                          <Info className="inline-block h-4 w-4 mr-1" />
                          Features
                        </div>
                        <ul className="list-disc ml-6 text-sm">
                          {item.features.map((f, idx) => (
                            <li key={idx}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Cars;