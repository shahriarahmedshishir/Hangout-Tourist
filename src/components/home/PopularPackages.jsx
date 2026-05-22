import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, imgUrl } from "@/lib/api";
import { Star, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PopularPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/packages")
      .then((data) =>
        setPackages(
          (Array.isArray(data) ? data : data.packages || []).slice(0, 6),
        ),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-16">
        <div className="container">
          <h2 className="mb-8 font-heading text-2xl font-bold text-foreground md:text-3xl">
            Popular Holidays
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

  if (!packages.length) return null;

  return (
    <section className="py-16">
      <div className="container">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
              Popular Holidays
            </h2>
            <p className="mt-1 text-muted-foreground">
              Curated holiday packages
            </p>
          </div>
          <Link to="/holidays" className="mt-4">
            <Button variant="outline" size="sm" className="gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, i) => (
            <Link key={pkg._id} to="/booking/package" state={{ pkg }}>
              <div
                className="group cursor-pointer overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in h-full"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                  {pkg.image ? (
                    <img
                      src={imgUrl(pkg.image)}
                      alt={pkg.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Sparkles className="h-12 w-12 opacity-30" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    {pkg.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{pkg.duration || "Custom"}</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      {pkg.rating || 4.7}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      Min {pkg.minimumPerson || pkg.minPerson || 1} people
                    </span>
                    <span className="font-heading text-lg font-bold text-primary">
                      ৳
                      {Number(
                        pkg.pricePerPerson || pkg.price || 0,
                      ).toLocaleString()}{" "}
                      / person
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
