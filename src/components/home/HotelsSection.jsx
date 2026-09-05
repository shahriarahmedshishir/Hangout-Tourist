import { api, imgUrl } from "@/lib/api";
import { ChevronRight, MapPin, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

export default function HotelsSection() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { checkIn, checkOut } = getCurrentDateRange();

    api
      .get("/api/hotels")
      .then(async (data) => {
        const hotelsWithDatePrices = await Promise.all(
          data.slice(0, 8).map(async (hotel) => {
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
  }, []);

  /* =========================
     Loading Skeleton
  ========================= */
  if (loading) {
    return (
      <section className="bg-[#f8f9fb] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <div className="mx-auto h-7 w-48 animate-pulse rounded-md bg-gray-200" />
            <div className="mx-auto mt-2 h-4 w-72 animate-pulse rounded-md bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="w-full">
                <div className="h-[280px] animate-pulse rounded-lg bg-gray-200 md:h-[320px]" />
                <div className="relative mx-4 -mt-12 h-28 animate-pulse rounded-lg bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!hotels.length) return null;

  // Duplicate items array for seamless loop
  const carouselItems = [...hotels, ...hotels];

  return (
    <section className="overflow-hidden bg-[#f8f9fb] py-12 md:py-16">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="mx-auto max-w-7xl">
        {/* =========================
            Section Header
        ========================= */}
        <div className="mb-10 px-4 text-center md:px-8">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-[#080d20] md:text-3xl lg:text-4xl">
            Curated Collections
          </h2>
          <p className="mt-2 text-sm text-[#60718e] md:text-base">
            Discover our handpicked selection of premium properties across the
            globe.
          </p>
        </div>

        {/* =========================
            Infinite Carousel
        ========================= */}
        <div className="relative w-full overflow-hidden py-4">
          <div className="animate-marquee flex gap-6 px-4">
            {carouselItems.map((hotel, index) => {
              const rating = Number(
                hotel.review?.rating ?? hotel.rating ?? hotel.averageRating,
              );
              const price = Number(hotel.datewiseMinPrice || 0);

              return (
                <Link
                  key={`${hotel._id}-${index}`}
                  to={`/hotels/${hotel._id}`}
                  className="group relative block w-[calc(100vw-2.5rem)] shrink-0 sm:w-[calc(50vw-2.5rem)] lg:w-[calc(33.333vw-2.5rem)] lg:max-w-[400px]"
                >
                  {/* Image Container - Height Increased */}
                  <div className="relative h-[280px] overflow-hidden rounded-lg bg-gray-200 md:h-[320px]">
                    {hotel.image ? (
                      <img
                        src={imgUrl(hotel.image)}
                        alt={hotel.name}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gray-200 text-5xl">
                        🏨
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                  </div>

                  {/* Information Overlay Card */}
                  <div className="relative z-10 mx-4 -mt-12 rounded-lg bg-white p-5 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      {/* Name & Location */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-heading text-lg font-semibold text-[#080d20] md:text-xl">
                          {hotel.name}
                        </h3>

                        {hotel.area && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#657692] md:text-sm">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {hotel.area}
                              {hotel.city ? `, ${hotel.city}` : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rating & Price */}
                      <div className="shrink-0 text-right">
                        <div className="flex items-center justify-end gap-1 text-[#ed8500]">
                          <Star
                            className="h-4 w-4"
                            fill="currentColor"
                            strokeWidth={1.5}
                          />
                          <span className="text-sm font-semibold">
                            {Number.isFinite(rating) && rating > 0
                              ? rating.toFixed(1)
                              : "New"}
                          </span>
                        </div>

                        <div className="mt-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-[#101522]">
                          FROM{" "}
                          <span className="text-xs font-bold md:text-sm">
                            {price > 0
                              ? `৳${price.toLocaleString("en-BD")}`
                              : "Unavailable"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* =========================
            View All Action
        ========================= */}
        <div className="mt-10 flex justify-center px-4">
          <Link
            to="/hotels"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-[#101522] bg-transparent px-7 text-sm font-semibold text-[#101522] transition-all duration-300 hover:bg-[#101522] hover:text-white"
          >
            <span>Visit More Hotels</span>
            <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
