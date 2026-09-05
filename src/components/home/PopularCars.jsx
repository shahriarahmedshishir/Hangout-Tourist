import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, imgUrl } from "@/lib/api";
import {
  Car,
  Zap,
  Settings2,
  Armchair,
  Snowflake,
  ChevronRight,
} from "lucide-react";

export default function PopularCars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/carrent")
      .then((data) => setCars(data.slice(0, 4)))
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
          {/* Heading Skeleton */}
          <div className="mb-8 text-center md:mb-10">
            <div className="mx-auto h-7 w-48 animate-pulse rounded bg-gray-200 md:h-8 md:w-64" />
            <div className="mx-auto mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-gray-200" />
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-lg bg-white shadow-sm"
              >
                <div className="h-40 animate-pulse bg-gray-200" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!cars.length) return null;

  return (
    <section className="overflow-hidden bg-[#f8f9fb] py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        {/* ==========================================
            Section Header
        =========================================== */}
        <div className="mb-8 text-center md:mb-10">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-[#080d20] md:text-3xl lg:text-4xl">
            Elite Transport
          </h2>

          <p className="mt-2 text-xs tracking-wide text-[#64748b] sm:text-sm md:text-base">
            Arrive in style with our exclusive fleet of premium luxury vehicles.
          </p>
        </div>

        {/* ==========================================
            Cars Grid
        =========================================== */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cars.map((car, i) => {
            const price = car.pricePerDay || car.price || 0;
            const seats = car.seats || 5;
            const transmission =
              car.transmission || car.transmissionType || "Automatic";
            const fuel =
              car.fuelType || car.fuel || car.engineType || "Petrol";
            const feature =
              car.feature ||
              car.features?.[0] ||
              car.category ||
              "Climate Control";

            return (
              <Link
                key={car._id}
                to="/booking/car"
                state={{ car }}
                className="group block animate-fade-in"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  {/* =================================
                      Car Image
                  ================================== */}
                  <div className="relative h-40 overflow-hidden bg-[#eef0f3] sm:h-44">
                    {car.images?.length > 0 ? (
                      <img
                        src={imgUrl(car.images[0])}
                        alt={car.name}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Car className="h-10 w-10 text-slate-300" />
                      </div>
                    )}

                    {/* Image Overlay */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>

                  {/* =================================
                      Card Content
                  ================================== */}
                  <div className="flex flex-1 flex-col p-4">
                    {/* Car Name */}
                    <h3 className="line-clamp-2 min-h-[44px] font-heading text-base font-medium leading-snug text-[#080d20] md:text-lg">
                      {car.name}
                    </h3>

                    {/* =================================
                        Specifications
                    ================================== */}
                    <div className="mt-3 space-y-2 text-xs text-[#657692] md:text-sm">
                      {/* Transmission */}
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">{transmission}</span>
                      </div>

                      {/* Seats */}
                      <div className="flex items-center gap-2">
                        <Armchair className="h-4 w-4 shrink-0" />
                        <span>
                          {seats} {seats === 1 ? "Seat" : "Seats"}
                        </span>
                      </div>

                      {/* Fuel */}
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 shrink-0" />
                        <span className="truncate">{fuel}</span>
                      </div>

                      {/* Optional Feature */}
                      {feature && (
                        <div className="flex items-center gap-2">
                          <Snowflake className="h-4 w-4 shrink-0" />
                          <span className="truncate">{feature}</span>
                        </div>
                      )}
                    </div>

                    {/* =================================
                        Price + Reserve
                    ================================== */}
                    <div className="mt-auto pt-4">
                      <div className="border-t border-[#e5e7eb] pt-3">
                        <div className="flex items-center justify-between">
                          {/* Price */}
                          <div>
                            <span className="text-base font-semibold text-[#101522] md:text-lg">
                              ${Number(price).toLocaleString()}
                            </span>
                            <span className="ml-1 text-xs text-[#657692]">
                              / day
                            </span>
                          </div>

                          {/* Reserve */}
                          <span className="text-xs font-semibold text-[#e77d00] transition-colors duration-300 group-hover:text-[#c96700] md:text-sm">
                            Reserve
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ==========================================
            View All Cars Action
        =========================================== */}
        <div className="mt-8 flex justify-center md:mt-10">
          <Link
            to="/cars"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-[#101522] bg-transparent px-6 text-sm font-semibold text-[#101522] transition-all duration-300 hover:bg-[#101522] hover:text-white"
          >
            <span>View All Cars</span>
            <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}