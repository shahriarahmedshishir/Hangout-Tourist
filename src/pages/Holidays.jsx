import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Helmet } from "react-helmet";
import {
  Palmtree,
  Clock,
  MapPin,
  Briefcase,
  Star,
  Sparkles,
} from "lucide-react";
import { api, imgUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";

const Holidays = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!loading && user && user.role === "hotel_staff") {
      navigate("/staff", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const response = await api.get("/api/packages");
        setPackages(response.packages || []);
      } catch (err) {
        console.error("Holiday packages load failed:", err);
        setFetchError(
          "Unable to load holiday packages. Please try again later.",
        );
      } finally {
        setLoadingPackages(false);
      }
    };
    loadPackages();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Hang Out Tourist | Holidays</title>
      </Helmet>
      <Navbar />
      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-gradient-to-r from-sky-900 via-slate-900 to-slate-950 p-10 text-white shadow-2xl shadow-slate-900/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm text-sky-200">
                <Sparkles className="h-4 w-4" />
                Explore curated holiday adventures
              </div>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  Travel packages designed for every dream.
                </h1>
                <p className="mt-4 max-w-2xl text-slate-200 sm:text-lg">
                  Choose from our ready-made holiday packages and book the
                  perfect trip with secure payment options.
                </p>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-slate-950/20">
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
                Holiday Packages
              </p>
              <p className="mt-3 text-3xl font-semibold">{packages.length}</p>
              <p className="mt-2 text-sm text-slate-300">
                Curated trips for your next adventure.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          {loadingPackages ? (
            <div className="rounded-3xl border border-slate-200/10 bg-white/80 p-10 text-center text-slate-700">
              Loading holiday packages...
            </div>
          ) : fetchError ? (
            <div className="rounded-3xl border border-red-200/30 bg-red-50 p-8 text-center text-red-700">
              {fetchError}
            </div>
          ) : packages.length === 0 ? (
            <div className="rounded-3xl border border-slate-200/10 bg-white/80 p-10 text-center text-slate-700">
              No holiday packages are available right now. Please check back
              soon.
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {packages.map((pkg) => (
                <div
                  key={pkg._id}
                  className="group relative overflow-hidden rounded-[32px] bg-black shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
                >
                  {/* Background Image */}
                  <div className="relative h-[560px] overflow-hidden">
                    <img
                      src={imgUrl(pkg.image)}
                      alt={pkg.name || "Holiday Package"}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                    {/* Content */}
                    <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                      {/* Duration */}
                      <span className="inline-flex rounded-full bg-white/15 px-4 py-1 text-xs font-medium backdrop-blur-md">
                        {pkg.duration || "Holiday Package"}
                      </span>

                      {/* Title */}
                      <h2 className="mt-4 text-3xl font-bold tracking-tight">
                        {pkg.name}
                      </h2>

                      {/* Info Chips */}
                      <div className="mt-5 flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur-md">
                          <MapPin className="h-4 w-4" />
                          <span className="text-xs">
                            {pkg.hotel || "Hotel Included"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur-md">
                          <Briefcase className="h-4 w-4" />
                          <span className="text-xs">
                            {pkg.transportation || "Transport"}
                          </span>
                        </div>
                      </div>

                      {/* Bottom */}
                      <div className="mt-6 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-white/60">From</p>

                          <h3 className="text-2xl font-bold">
                            ৳{Number(pkg.pricePerPerson || 0).toLocaleString()}
                          </h3>

                          <p className="text-xs text-white/70">
                            {pkg.minimumPerson || 1}+ People
                          </p>
                        </div>

                        <Button
                          onClick={() => {
                            if (!user) {
                              navigate("/login", {
                                state: {
                                  redirectTo: "/booking/package",
                                  pkg,
                                },
                              });
                            } else {
                              navigate("/booking/package", {
                                state: { pkg },
                              });
                            }
                          }}
                          className="rounded-full bg-white px-7 py-6 text-base font-semibold text-slate-900 transition hover:bg-slate-100"
                        >
                          Reserve Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default Holidays;
