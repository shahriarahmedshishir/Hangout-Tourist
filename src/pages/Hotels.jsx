import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, imgUrl } from "@/lib/api";
import { MapPin, SlidersHorizontal } from "lucide-react";

const Hotels = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("price");
  const [search, setSearch] = useState("");

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
              <div className="grid gap-5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-40 rounded-2xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  {filtered.length} hotels found
                </div>
                <div className="flex flex-col gap-5">
                  {filtered.map((hotel, i) => (
                    <Link
                      key={hotel._id}
                      to={`/hotels/${hotel._id}`}
                      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-card-hover animate-fade-in"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="relative h-48 shrink-0 overflow-hidden bg-muted md:h-auto md:w-64">
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
                        <div className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <h3 className="font-heading text-lg font-bold text-foreground">
                              {hotel.name}
                            </h3>
                            {hotel.area && (
                              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" /> {hotel.area}
                              </p>
                            )}
                            {hotel.description && (
                              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                {hotel.description}
                              </p>
                            )}
                            {hotel.services?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {hotel.services.map((s) => (
                                  <span
                                    key={s}
                                    className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {hotel.roomCount || 0} rooms
                              </p>
                              <p className="font-heading font-bold text-primary">
                                ৳{(hotel.minPrice || 0).toLocaleString()}
                                {hotel.maxPrice > hotel.minPrice && (
                                  <span className="text-sm font-normal text-muted-foreground">
                                    {" "}
                                    – ৳{hotel.maxPrice.toLocaleString()}
                                  </span>
                                )}
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
                              View Rooms
                            </Button>
                          </div>
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
