import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, imgUrl } from "@/lib/api";
import { MapPin, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HotelsSection() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/hotels")
      .then((data) => setHotels(data.slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-16">
        <div className="container">
          <h2 className="mb-8 font-heading text-2xl font-bold text-foreground md:text-3xl">
            Hotels & Stays
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-muted animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!hotels.length) return null;

  return (
    <section className="py-16">
      <div className="container">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
              Hotels & Stays
            </h2>
            <p className="mt-1 text-muted-foreground">
              Find the perfect place to stay
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {hotels.map((hotel, i) => (
            <Link
              key={hotel._id}
              to={`/hotels/${hotel._id}`}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="relative h-44 overflow-hidden bg-muted">
                {hotel.image ? (
                  <img
                    src={imgUrl(hotel.image)}
                    alt={hotel.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">
                    🏨
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-xs font-medium">
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-heading font-bold text-foreground">
                  {hotel.name}
                </h3>
                {hotel.area && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {hotel.area}
                  </p>
                )}

                {hotel.services?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hotel.services.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground"
                      >
                        {s}
                      </span>
                    ))}
                    {hotel.services.length > 3 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
                        +{hotel.services.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {hotel.roomCount || 0} rooms · from
                    </span>
                    <p className="font-heading font-bold text-primary">
                      ৳{hotel.minPrice?.toLocaleString() || 0}
                      {hotel.maxPrice > hotel.minPrice && (
                        <span className="text-sm font-normal text-muted-foreground">
                          {" "}
                          – ৳{hotel.maxPrice?.toLocaleString()}
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
                    Details
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="container flex justify-center mt-6">
        <Link to="/hotels">
          <Button variant="outline" size="sm" className="gap-1 rounded-xl">
            View All Hotels <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
