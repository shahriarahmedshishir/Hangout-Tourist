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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, imgUrl } from "@/lib/api";

const Cars = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeImg, setActiveImg] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

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

  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === "hotel_staff") {
        navigate("/staff", { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    api
      .get("/api/cars")
      .then((data) => setCars(data))
      .catch(() => setCars([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filtered = cars.filter(
    (car) =>
      !search ||
      car.name?.toLowerCase().includes(search.toLowerCase()) ||
      car.type?.toLowerCase().includes(search.toLowerCase()) ||
      car.places?.some((p) => p.toLowerCase().includes(search.toLowerCase())),
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedCars = filtered.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-primary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-primary-foreground md:text-3xl">
            Car Rental
          </h1>
          <p className="text-primary-foreground/80">
            Rent a car for your trip at the best rates
          </p>
        </div>
      </div>

      <div className="container py-8">
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

        {/* Car Grid */}
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
                                    ((p[car._id] || 0) + 1) % car.images.length,
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
                      // Show first page, last page, current page, and adjacent pages
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
      </div>
      <Footer />
    </div>
  );
};

export default Cars;
