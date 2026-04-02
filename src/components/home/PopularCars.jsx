import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, imgUrl } from "@/lib/api";
import { Star, ChevronRight, Zap, Car } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PopularCars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/cars")
      .then((data) => setCars(data.slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-16">
        <div className="container">
          <h2 className="mb-8 font-heading text-2xl font-bold text-foreground md:text-3xl">
            Popular Cars
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

  if (!cars.length) return null;

  return (
    <section className="py-16">
      <div className="container">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
              Popular Cars
            </h2>
            <p className="mt-1 text-muted-foreground">
              Rent the perfect car for your journey
            </p>
          </div>
          <Link to="/cars" className="mt-4">
            <Button variant="outline" size="sm" className="gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cars.map((car, i) => (
            <Link key={car._id} to={`/cars/${car._id}`}>
              <div
                className="group cursor-pointer overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in h-full"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                  {car.images?.length > 0 ? (
                    <img
                      src={imgUrl(car.images[0])}
                      alt={car.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Car className="h-12 w-12 opacity-30" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    {car.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{car.type || "Standard"}</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      {car.rating || 4.5}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      {car.seats || 5} Seats
                    </span>
                    <span className="font-heading text-lg font-bold text-primary">
                      ${car.pricePerDay || car.price}/day
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
