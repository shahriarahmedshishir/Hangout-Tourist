import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, imgUrl } from "@/lib/api";
import {
  MapPin,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const Hotels = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("price");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3 columns x 3 rows

  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === "hotel_staff") {
        navigate("/staff", { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    api
      .get("/api/hotels")
      .then((data) => setHotels(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = hotels
    .filter(
      (h) =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        (h.area || "").toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sortBy === "price" ? (a.minPrice || 0) - (b.minPrice || 0) : 0,
    );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedHotels = filtered.slice(startIdx, startIdx + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-secondary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-secondary-foreground md:text-3xl">
            Hotels & Stays
          </h1>
          <p className="text-secondary-foreground/80">
            Find your perfect stay worldwide
          </p>
        </div>
      </div>
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 font-heading font-bold text-foreground">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </h3>
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Search
                </label>
                <Input
                  placeholder="Hotel name or area..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-muted"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Sort By
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Lowest Price", value: "price" },
                    { label: "Newest First", value: "new" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="sort"
                        checked={sortBy === opt.value}
                        onChange={() => setSortBy(opt.value)}
                        className="accent-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid gap-5 md:grid-cols-3">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  {filtered.length} hotels found (Showing {startIdx + 1}-
                  {Math.min(startIdx + itemsPerPage, filtered.length)})
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                  {paginatedHotels.map((hotel, i) => (
                    <Link
                      key={hotel._id}
                      to={`/hotels/${hotel._id}`}
                      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1 animate-fade-in flex flex-col"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="relative h-48 shrink-0 overflow-hidden bg-muted">
                        {hotel.image ? (
                          <img
                            src={imgUrl(hotel.image)}
                            alt={hotel.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-5xl">
                            🏨
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-4">
                        <div>
                          <h3 className="font-heading text-lg font-bold text-foreground line-clamp-2">
                            {hotel.name}
                          </h3>
                          {hotel.area && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {hotel.area}
                            </p>
                          )}
                          {hotel.description && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                              {hotel.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {hotel.roomCount || 0} rooms
                            </p>
                            <p className="font-heading font-bold text-primary text-sm">
                              ৳{(hotel.minPrice || 0).toLocaleString()}
                              <span className="text-xs font-normal text-muted-foreground">
                                {" "}
                                /night
                              </span>
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {!filtered.length && (
                    <div className="py-20 text-center text-muted-foreground">
                      No hotels found. Check back soon!
                    </div>
                  )}
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
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default Hotels;
