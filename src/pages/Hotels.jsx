import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api, imgUrl } from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid3x3,
  LayoutList,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation, useNavigate } from "react-router-dom";

const formatDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentDateRange = () => {
  const checkIn = new Date();
  checkIn.setHours(0, 0, 0, 0);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);

  return {
    checkIn: formatDateValue(checkIn),
    checkOut: formatDateValue(checkOut),
  };
};

export default function Hotels() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("price");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [viewMode, setViewMode] = useState("compact");

  const itemsPerPage = viewMode === "compact" ? 12 : 6;

  // Role Protection
  useEffect(() => {
    if (!authLoading && user && user.role === "hotel_staff") {
      navigate("/staff", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Fetch Hotels and set initial query parameter
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const q = params.get("q");
      if (q) setSearch(q);
    } catch (err) {}

    let cancelled = false;
    const { checkIn, checkOut } = getCurrentDateRange();

    api
      .get("/api/hotels")
      .then(async (data) => {
        const hotelsWithDatePrices = await Promise.all(
          (data || []).map(async (hotel) => {
            try {
              const rooms = await api.get(
                `/api/hotels/${hotel._id}/rooms?checkIn=${checkIn}&checkOut=${checkOut}`,
              );
              const availablePrices = rooms
                .filter((room) => !room.isBooked && room.isAvailable !== false)
                .map((room) => Number(room.effectivePrice ?? room.price))
                .filter((price) => Number.isFinite(price) && price > 0);

              return {
                ...hotel,
                datewiseMinPrice:
                  availablePrices.length > 0 ? Math.min(...availablePrices) : 0,
              };
            } catch {
              return { ...hotel, datewiseMinPrice: 0 };
            }
          }),
        );

        if (!cancelled) setHotels(hotelsWithDatePrices);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location.search]);

  // Normalized Filtering & Sorting Optimization
  const filtered = useMemo(() => {
    return hotels
      .filter((h) => {
        const normalize = (s = "") =>
          String(s)
            .toLowerCase()
            .replace(/[\u2018\u2019'`’]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const ns = normalize(search);
        const name = normalize(h.name || "");
        const area = normalize(h.area || "");
        const matches = !ns || name.includes(ns) || area.includes(ns);

        const price = h.datewiseMinPrice || 0;
        return matches && price >= priceRange[0] && price <= priceRange[1];
      })
      .sort((a, b) => {
        if (sortBy === "price")
          return (a.datewiseMinPrice || 0) - (b.datewiseMinPrice || 0);
        if (sortBy === "popular")
          return (b.roomCount || 0) - (a.roomCount || 0);
        return 0;
      });
  }, [hotels, search, priceRange, sortBy]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedHotels = filtered.slice(startIdx, startIdx + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, priceRange, viewMode]);

  const hasActiveFilters =
    search.trim() !== "" || priceRange[0] > 0 || priceRange[1] < 50000;

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#080d20]">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Hang Out Tourist | Hotels</title>
      </Helmet>

      <Navbar />

      {/* Hero / Header Section */}
      <section className="bg-white border-b border-[#e5e7eb] py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="max-w-2xl">
            <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
              Discover Places to Stay
            </h1>
            <p className="mt-2 text-xs font-medium text-[#657692] md:text-sm">
              Explore handpicked hotels, resorts, and vacation stays at the best
              rates.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          {/* ==========================================
              Sidebar Filter (Desktop & Mobile Drawer)
          =========================================== */}
          {showMobileSidebar && (
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}

          <aside
            className={`fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-white p-5 shadow-xl transition-transform duration-300 lg:sticky lg:top-4 lg:z-auto lg:w-72 lg:max-w-none lg:translate-x-0 lg:rounded-xl lg:border lg:border-[#e5e7eb] lg:p-5 lg:shadow-sm ${
              showMobileSidebar ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-full flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    <h2 className="font-heading text-sm font-bold text-[#080d20]">
                      Filter Hotels
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowMobileSidebar(false)}
                    className="rounded-md p-1 text-[#657692] hover:bg-gray-100 lg:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 space-y-6">
                  {/* Search Filter */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#657692]">
                      Search Location / Hotel
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#657692]" />
                      <Input
                        placeholder="Hotel name or area..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 border-[#e5e7eb] bg-[#f8f9fb] pl-9 text-xs focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Price Range Filter */}
                  <div className="border-t border-[#e5e7eb] pt-5">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#657692]">
                      Price Range (BDT)
                    </label>

                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-[#657692]">
                          <span>Min Price</span>
                          <span className="font-semibold text-[#080d20]">
                            ৳{priceRange[0].toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50000"
                          step="1000"
                          value={priceRange[0]}
                          onChange={(e) =>
                            setPriceRange([
                              parseInt(e.target.value),
                              priceRange[1],
                            ])
                          }
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary"
                        />
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-xs text-[#657692]">
                          <span>Max Price</span>
                          <span className="font-semibold text-[#080d20]">
                            ৳{priceRange[1].toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50000"
                          step="1000"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([
                              priceRange[0],
                              parseInt(e.target.value),
                            ])
                          }
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <div className="border-t border-[#e5e7eb] pt-4">
                  <Button
                    onClick={() => {
                      setSearch("");
                      setPriceRange([0, 50000]);
                    }}
                    variant="outline"
                    className="h-9 w-full text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/20"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </aside>

          {/* ==========================================
              Main Content Display Area
          =========================================== */}
          <div className="flex-1">
            {/* Controls Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMobileSidebar(true)}
                  className="h-9 gap-2 border-[#e5e7eb] px-3 text-xs lg:hidden"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filters</span>
                </Button>

                <p className="text-xs font-medium text-[#657692]">
                  Showing{" "}
                  <span className="font-bold text-[#080d20]">
                    {filtered.length}
                  </span>{" "}
                  results
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Sort Option */}
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-[#657692] sm:inline">
                    Sort by:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-9 rounded-md border border-[#e5e7eb] bg-white px-2.5 text-xs font-medium text-[#080d20] focus:border-primary focus:outline-none"
                  >
                    <option value="price">Lowest Price</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>

                {/* View Mode Switcher */}
                <div className="hidden items-center rounded-md border border-[#e5e7eb] p-0.5 sm:flex">
                  <button
                    onClick={() => setViewMode("compact")}
                    className={`rounded p-1.5 transition-colors ${
                      viewMode === "compact"
                        ? "bg-primary text-white"
                        : "text-[#657692] hover:text-[#080d20]"
                    }`}
                    title="Grid View"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("mirrored")}
                    className={`rounded p-1.5 transition-colors ${
                      viewMode === "mirrored"
                        ? "bg-primary text-white"
                        : "text-[#657692] hover:text-[#080d20]"
                    }`}
                    title="List View"
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading Grid */}
            {loading ? (
              <div
                className={
                  viewMode === "compact"
                    ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
                    : "space-y-4"
                }
              >
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-xl bg-gray-200"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              /* Empty Results State */
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e5e7eb] bg-white py-14 px-4 text-center">
                <Search className="h-10 w-10 text-gray-400" />
                <h3 className="mt-3 font-heading text-base font-bold text-[#080d20]">
                  No hotels matched your criteria
                </h3>
                <p className="mt-1 text-xs text-[#657692]">
                  Try adjusting your search location or price filters.
                </p>
                <Button
                  onClick={() => {
                    setSearch("");
                    setPriceRange([0, 50000]);
                  }}
                  size="sm"
                  variant="outline"
                  className="mt-4 h-9 text-xs"
                >
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Render Grid or List View */}
                {viewMode === "compact" ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedHotels.map((hotel, i) => (
                      <CompactHotelCard
                        key={hotel._id}
                        hotel={hotel}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedHotels.map((hotel, i) => (
                      <MirroredHotelCard
                        key={hotel._id}
                        hotel={hotel}
                        index={i}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col items-center gap-3 border-t border-[#e5e7eb] pt-6">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setCurrentPage((p) => Math.max(1, p - 1));
                          window.scrollTo({ top: 150, behavior: "smooth" });
                        }}
                        disabled={currentPage === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#080d20] hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => {
                              setCurrentPage(page);
                              window.scrollTo({ top: 150, behavior: "smooth" });
                            }}
                            className={`h-8 min-w-[32px] rounded-md text-xs font-semibold ${
                              currentPage === page
                                ? "bg-primary text-white"
                                : "border border-[#e5e7eb] bg-white text-[#080d20] hover:bg-gray-100"
                            }`}
                          >
                            {page}
                          </button>
                        ),
                      )}

                      <button
                        onClick={() => {
                          setCurrentPage((p) => Math.min(totalPages, p + 1));
                          window.scrollTo({ top: 150, behavior: "smooth" });
                        }}
                        disabled={currentPage === totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#080d20] hover:bg-gray-100 disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#657692]">
                      Page {currentPage} of {totalPages}
                    </p>
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
}

/* ====================================================================
   Compact Hotel Card
==================================================================== */
function CompactHotelCard({ hotel, index }) {
  return (
    <Link
      to={`/hotels/${hotel._id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="relative h-40 w-full overflow-hidden bg-gray-100 sm:h-44">
        {hotel.image ? (
          <img
            src={imgUrl(hotel.image)}
            alt={hotel.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl bg-gray-100">
            🏨
          </div>
        )}

        {hotel.roomCount > 15 && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-white">
            <Zap className="h-3 w-3" />
            <span>Popular</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-heading text-base font-semibold text-[#080d20]">
          {hotel.name}
        </h3>

        {hotel.area && (
          <p className="mt-1 flex items-center gap-1 text-xs text-[#657692]">
            <MapPin className="h-3 w-3 shrink-0 text-primary" />
            <span className="line-clamp-1">{hotel.area}</span>
          </p>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-[#657692]">
          <Users className="h-3.5 w-3.5" />
          <span>{hotel.roomCount || 0} rooms available</span>
          <span className="ml-auto flex items-center gap-1 text-[#ed8500]">
            <Star className="h-3.5 w-3.5" fill="currentColor" />
            {Number(hotel.review?.rating ?? hotel.rating ?? 0) > 0
              ? Number(hotel.review?.rating ?? hotel.rating).toFixed(1)
              : "New"}
          </span>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between border-t border-[#e5e7eb] pt-3">
            <div>
              <span className="text-[10px] uppercase tracking-wide text-[#657692]">
                From
              </span>
              <p className="font-heading text-base font-bold text-primary">
                {hotel.datewiseMinPrice > 0
                  ? `৳${hotel.datewiseMinPrice.toLocaleString("en-BD")}`
                  : "Unavailable"}
                <span className="text-[10px] font-normal text-[#657692]">
                  {" "}
                  /night
                </span>
              </p>
            </div>
            <Button size="sm" className="h-8 px-3 text-xs font-medium">
              Details
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ====================================================================
   Mirrored (List) Hotel Card
==================================================================== */
function MirroredHotelCard({ hotel, index }) {
  return (
    <Link
      to={`/hotels/${hotel._id}`}
      className="group block overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-md sm:p-4"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Image */}
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-36 sm:w-48">
          {hotel.image ? (
            <img
              src={imgUrl(hotel.image)}
              alt={hotel.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl">
              🏨
            </div>
          )}

          {hotel.roomCount > 15 && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
              <Zap className="h-2.5 w-2.5" /> Popular
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-[#080d20] md:text-lg">
              {hotel.name}
            </h3>

            {hotel.area && (
              <p className="mt-1 flex items-center gap-1 text-xs text-[#657692]">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{hotel.area}</span>
              </p>
            )}

            {hotel.description && (
              <p className="mt-2 line-clamp-2 text-xs text-[#657692]">
                {hotel.description}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#e5e7eb] pt-3">
            <div className="flex items-center gap-1 text-xs text-[#657692]">
              <Users className="h-3.5 w-3.5" />
              <span>{hotel.roomCount || 0} Rooms</span>
            </div>

            <div className="flex items-center gap-1 text-xs text-[#ed8500]">
              <Star className="h-3.5 w-3.5" fill="currentColor" />
              {Number(hotel.review?.rating ?? hotel.rating ?? 0) > 0
                ? Number(hotel.review?.rating ?? hotel.rating).toFixed(1)
                : "New"}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-[#657692]">From</span>
                <p className="font-heading text-base font-bold text-primary">
                  {hotel.datewiseMinPrice > 0
                    ? `৳${hotel.datewiseMinPrice.toLocaleString("en-BD")}`
                    : "Unavailable"}
                  <span className="text-[10px] font-normal text-[#657692]">
                    {" "}
                    /night
                  </span>
                </p>
              </div>
              <Button size="sm" className="h-8 px-4 text-xs">
                View Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
