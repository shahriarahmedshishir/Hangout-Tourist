import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, imgUrl } from "@/lib/api";
import { ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PopularPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/packages")
      .then((data) =>
        setPackages(
          (Array.isArray(data) ? data : data.packages || []).slice(0, 8),
        ),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ================================
     Loading State
  ================================= */
  if (loading) {
    return (
      <section className="bg-[#f8f9fb] py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-8 text-center md:mb-10">
            <div className="mx-auto h-7 w-48 animate-pulse rounded bg-gray-200 md:h-8 md:w-64" />
            <div className="mx-auto mt-2 h-4 w-60 max-w-full animate-pulse rounded bg-gray-200" />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl bg-gray-200"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!packages.length) return null;

  return (
    <section className="bg-[#f8f9fb] py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        {/* ==========================================
            Section Header
        =========================================== */}
        <div className="mb-8 text-center md:mb-10">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-[#080d20] md:text-3xl lg:text-4xl">
            Popular Holidays
          </h2>
          <p className="mt-2 text-xs tracking-wide text-[#64748b] sm:text-sm md:text-base">
            Curated holiday packages for your next getaway.
          </p>
        </div>

        {/* ==========================================
            Packages Grid
        =========================================== */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {packages.map((pkg, i) => (
            <Link
              key={pkg._id}
              to="/booking/package"
              state={{ pkg }}
              className="group block h-full animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                {/* Image Container */}
                <div className="relative h-40 overflow-hidden bg-gray-100 sm:h-44">
                  {pkg.image ? (
                    <img
                      src={imgUrl(pkg.image)}
                      alt={pkg.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <Sparkles className="h-8 w-8 opacity-40" />
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                {/* Card Content */}
                <div className="flex flex-1 flex-col p-4">
                  {/* Title */}
                  <h3 className="line-clamp-2 min-h-[44px] font-heading text-base font-semibold text-[#080d20] md:text-lg">
                    {pkg.name}
                  </h3>

                  {/* Duration */}
                  <div className="mt-1.5 text-xs text-[#657692] md:text-sm">
                    <span>{pkg.duration || "Custom Duration"}</span>
                  </div>

                  {/* Price & Capacity Footer */}
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between border-t border-[#e5e7eb] pt-3">
                      <span className="text-xs text-[#657692]">
                        Min {pkg.minimumPerson || pkg.minPerson || 1} {pkg.minimumPerson === 1 ? "person" : "people"}
                      </span>

                      <div className="text-right">
                        <span className="font-heading text-base font-bold text-primary md:text-lg">
                          ৳{Number(pkg.pricePerPerson || pkg.price || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#657692]"> / person</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ==========================================
            View All Action
        =========================================== */}
        <div className="mt-8 flex justify-center md:mt-10">
          <Link to="/holidays">
            <Button
              variant="outline"
              size="sm"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-[#101522] bg-transparent px-6 text-sm font-semibold text-[#101522] transition-all duration-300 hover:bg-[#101522] hover:text-white"
            >
              <span>View All Packages</span>
              <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}