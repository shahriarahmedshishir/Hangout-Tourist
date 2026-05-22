import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, imgUrl } from "@/lib/api";
import {
  MapPin,
  Search,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Zap,
  Users,
  LayoutList,
  Grid3x3,
} from "lucide-react";

const Hotels = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("price");
  const [search, setSearch] = useState("");
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState(new Set());
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [viewMode, setViewMode] = useState("compact"); // compact or mirrored

  const itemsPerPage = viewMode === "compact" ? 12 : 6;

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
    api
      .get("/api/hotels")
      .then((data) => setHotels(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = hotels
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
      return (
        matches &&
        (h.minPrice || 0) >= priceRange[0] &&
        (h.minPrice || 0) <= priceRange[1]
      );
    })
    .sort((a, b) =>
      sortBy === "price"
        ? (a.minPrice || 0) - (b.minPrice || 0)
        : sortBy === "popular"
          ? (b.roomCount || 0) - (a.roomCount || 0)
          : 0,
    );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedHotels = filtered.slice(startIdx, startIdx + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, priceRange, viewMode]);

  const toggleFavorite = (hotelId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(hotelId)) {
      newFavorites.delete(hotelId);
    } else {
      newFavorites.add(hotelId);
    }
    setFavorites(newFavorites);
  };

  const hasActiveFilters = search || priceRange[0] > 0 || priceRange[1] < 50000;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/25 via-primary/10 to-transparent py-4 md:py-8 px-4 md:px-0">
        <div className="container">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-1 md:mb-2">
            Discover Hotels
          </h1>
          <p className="text-xs md:text-base text-muted-foreground">
            Find and book your perfect stay
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container px-3 md:px-6 py-4 md:py-10">
        <div className="flex gap-3 md:gap-6 lg:gap-8 flex-col lg:flex-row">
          {/* Sidebar - Mobile Overlay */}
          {showMobileSidebar && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed left-0 top-0 bottom-0 z-50 w-full max-w-xs bg-background overflow-auto transition-transform duration-300 lg:static lg:z-auto lg:bg-transparent lg:w-80 lg:max-w-none lg:overflow-visible ${
              showMobileSidebar
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }`}
          >
            <div className="bg-card rounded-2xl border border-border shadow-card p-4 md:p-6 lg:sticky lg:top-24">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Filters
                </h2>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="lg:hidden p-1 hover:bg-muted rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Search Filter */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Hotel name or area..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-muted border-0 rounded-lg focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="border-t border-border pt-6">
                  <label className="block text-xs font-semibold text-foreground mb-4 uppercase tracking-wide">
                    Price Range
                  </label>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">
                        Min: ৳{priceRange[0].toLocaleString()}
                      </label>
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
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">
                        Max: ৳{priceRange[1].toLocaleString()}
                      </label>
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
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                    <p className="text-xs md:text-sm text-foreground font-medium">
                      ৳{priceRange[0].toLocaleString()} - ৳
                      {priceRange[1].toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    onClick={() => {
                      setSearch("");
                      setPriceRange([0, 50000]);
                    }}
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 text-xs md:text-sm"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Top Bar - Settings */}
            <div className="mb-6 md:mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                {/* Mobile Sidebar Toggle */}
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="lg:hidden flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded-lg bg-card border border-border hover:bg-muted transition-colors font-medium text-xs md:text-sm col-span-1"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                </button>

                {/* Sort Card */}
                <div className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 col-span-1">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                    Sort
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-muted border-0 rounded-lg text-foreground text-xs md:text-sm py-1.5 md:py-2 px-2 md:px-3 focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="price">Lowest Price</option>
                    <option value="popular">Most Popular</option>
                    <option value="new">Newest</option>
                  </select>
                </div>

                {/* View Mode Card */}
                <div className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 col-span-1">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                    View
                  </label>
                  <div className="flex gap-1.5 md:gap-2">
                    <button
                      onClick={() => setViewMode("compact")}
                      className={`flex-1 p-1.5 md:p-2 rounded-lg border transition-all flex items-center justify-center ${
                        viewMode === "compact"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-muted hover:bg-muted/80"
                      }`}
                      title="Compact View"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("mirrored")}
                      className={`flex-1 p-1.5 md:p-2 rounded-lg border transition-all flex items-center justify-center ${
                        viewMode === "mirrored"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-muted hover:bg-muted/80"
                      }`}
                      title="Mirrored View"
                    >
                      <LayoutList className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Results Info Card */}
                <div className="bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 col-span-1">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">
                    Results
                  </p>
                  <p className="text-lg md:text-2xl font-bold text-primary">
                    {filtered.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Hotels Grid/List */}
            {loading ? (
              <div
                className={
                  viewMode === "compact"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6"
                    : "flex flex-col gap-4 md:gap-6"
                }
              >
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div
                      className={`${
                        viewMode === "compact" ? "aspect-video" : "h-32 md:h-40"
                      } rounded-2xl bg-muted mb-3`}
                    />
                    <div className="space-y-2">
                      <div className="h-3 md:h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/50 py-12 md:py-24 px-4">
                <Search className="h-10 md:h-12 w-10 md:w-12 text-muted-foreground mb-3 md:mb-4" />
                <h3 className="font-heading text-base md:text-xl font-bold text-foreground mb-1 md:mb-2">
                  No hotels found
                </h3>
                <p className="text-xs md:text-base text-muted-foreground mb-4 md:mb-6 text-center max-w-md">
                  Try adjusting your filters or search criteria to find more
                  options.
                </p>
                <Button
                  onClick={() => {
                    setSearch("");
                    setPriceRange([0, 50000]);
                  }}
                  variant="outline"
                  className="text-xs md:text-sm"
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Hotels Grid/List - Render based on view mode */}
                {viewMode === "compact" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
                    {paginatedHotels.map((hotel, i) => (
                      <CompactHotelCard
                        key={hotel._id}
                        hotel={hotel}
                        isFavorite={favorites.has(hotel._id)}
                        onToggleFavorite={toggleFavorite}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-6 mb-8 md:mb-12">
                    {paginatedHotels.map((hotel, i) => (
                      <MirroredHotelCard
                        key={hotel._id}
                        hotel={hotel}
                        isFavorite={favorites.has(hotel._id)}
                        onToggleFavorite={toggleFavorite}
                        index={i}
                        isEven={i % 2 === 0}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-3 md:gap-6 py-6 md:py-12 border-t border-border">
                    <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2">
                      <button
                        onClick={() => {
                          setCurrentPage(Math.max(1, currentPage - 1));
                          window.scrollTo({ top: 200, behavior: "smooth" });
                        }}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1,
                        ).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => {
                                  setCurrentPage(page);
                                  window.scrollTo({
                                    top: 200,
                                    behavior: "smooth",
                                  });
                                }}
                                className={`min-w-9 md:min-w-10 h-9 md:h-10 rounded-lg text-xs md:text-sm font-medium transition-all ${
                                  currentPage === page
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card border border-border hover:bg-muted"
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === 2 || page === totalPages - 1) {
                            return (
                              <span
                                key={`ellipsis-${page}`}
                                className="px-1 md:px-2 text-muted-foreground text-xs"
                              >
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>

                      <button
                        onClick={() => {
                          setCurrentPage(Math.min(totalPages, currentPage + 1));
                          window.scrollTo({ top: 200, behavior: "smooth" });
                        }}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs md:text-sm text-muted-foreground">
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
};

// Compact Hotel Card Component
function CompactHotelCard({ hotel, isFavorite, onToggleFavorite, index }) {
  return (
    <Link
      to={`/hotels/${hotel._id}`}
      className="group rounded-xl md:rounded-2xl border border-border bg-card shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in overflow-hidden h-full flex flex-col"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {hotel.image ? (
          <img
            src={imgUrl(hotel.image)}
            alt={hotel.name}
            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl md:text-5xl bg-gradient-to-br from-muted to-muted/50">
            🏨
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(hotel._id);
          }}
          className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 md:p-2 rounded-full bg-white/90 hover:bg-white transition-all shadow-md hover:shadow-lg z-10"
        >
          <Heart
            className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
              isFavorite
                ? "fill-red-500 text-red-500"
                : "text-muted-foreground hover:text-red-500"
            }`}
          />
        </button>

        {/* Price Badge */}
        <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 bg-black/70 text-white px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg">
          <p className="text-xs text-white/80">From</p>
          <p className="font-bold text-xs md:text-sm">
            ৳{(hotel.minPrice || 0).toLocaleString()}
          </p>
        </div>

        {/* Popular Badge */}
        {hotel.roomCount > 15 && (
          <div className="absolute top-2 left-2 md:top-3 md:left-3 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-xs font-medium">
            <Zap className="h-2.5 w-2.5 md:h-3 md:w-3" />
            <span className="hidden sm:inline">Popular</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
            <h3 className="font-heading text-xs md:text-base font-bold text-foreground line-clamp-2 flex-1">
              {hotel.name}
            </h3>
            <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg flex-shrink-0">
              <Star className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs md:text-sm font-bold text-amber-700">
                4.5
              </span>
            </div>
          </div>

          {hotel.area && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2 md:mb-3">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="line-clamp-1">{hotel.area}</span>
            </p>
          )}

          {/* Room Count */}
          <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-muted text-foreground font-medium">
            <Users className="h-3 w-3" />
            {hotel.roomCount || 0} rooms
          </div>
        </div>

        {/* CTA Button */}
        <Button
          asChild
          className="w-full mt-3 md:mt-4 bg-primary text-primary-foreground hover:opacity-90 py-1.5 md:py-2 text-xs md:text-sm h-auto"
        >
          <Link to={`/hotels/${hotel._id}`}>View Details</Link>
        </Button>
      </div>
    </Link>
  );
}

// Mirrored Hotel Card Component
function MirroredHotelCard({
  hotel,
  isFavorite,
  onToggleFavorite,
  index,
  isEven,
}) {
  return (
    <Link
      to={`/hotels/${hotel._id}`}
      className="block group rounded-xl md:rounded-2xl border border-border bg-card shadow-card hover:shadow-lg transition-all duration-300 animate-fade-in overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className={`flex flex-col ${
          isEven ? "md:flex-row" : "md:flex-row-reverse"
        } gap-3 md:gap-6 p-3 md:p-6`}
      >
        {/* Image */}
        <div className="relative h-32 md:h-40 lg:h-48 w-full md:w-2/5 lg:w-1/2 shrink-0 rounded-lg overflow-hidden bg-muted">
          {hotel.image ? (
            <img
              src={imgUrl(hotel.image)}
              alt={hotel.name}
              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl md:text-5xl bg-gradient-to-br from-muted to-muted/50">
              🏨
            </div>
          )}

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(hotel._id);
            }}
            className="absolute top-2 right-2 p-1.5 md:p-2 rounded-full bg-white/90 hover:bg-white transition-all shadow-md"
          >
            <Heart
              className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                isFavorite
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground hover:text-red-500"
              }`}
            />
          </button>

          {/* Popular Badge */}
          {hotel.roomCount > 15 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-xs font-medium">
              <Zap className="h-2.5 w-2.5 md:h-3 md:w-3" />
              Popular
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0 md:w-3/5 lg:w-1/2">
          <div>
            <h3 className="font-heading text-base md:text-lg lg:text-xl font-bold text-foreground line-clamp-2 mb-1 md:mb-2">
              {hotel.name}
            </h3>

            {hotel.area && (
              <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 mb-2 md:mb-3">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="line-clamp-1">{hotel.area}</span>
              </p>
            )}

            {hotel.description && (
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 md:line-clamp-3 mb-3 md:mb-4">
                {hotel.description}
              </p>
            )}

            {/* Features */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="inline-flex items-center gap-1 text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-muted text-foreground font-medium">
                <Users className="h-3 w-3" />
                {hotel.roomCount || 0} rooms
              </div>
              <div className="inline-flex items-center gap-1 bg-amber-50 px-2 md:px-3 py-1 md:py-1.5 rounded-lg">
                <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs md:text-sm font-bold text-amber-700">
                  4.5
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-heading font-bold text-base md:text-lg lg:text-xl text-primary">
                ৳{(hotel.minPrice || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">/night</p>
            </div>
            <Button
              asChild
              className="bg-primary text-primary-foreground hover:opacity-90 py-2 md:py-3 px-4 md:px-6 text-xs md:text-sm h-auto"
            >
              <Link to={`/hotels/${hotel._id}`}>View Details</Link>
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default Hotels;
