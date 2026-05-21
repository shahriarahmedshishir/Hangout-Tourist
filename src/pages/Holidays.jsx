import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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
                  className="group overflow-hidden rounded-[2rem] border border-slate-200/10 bg-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  {pkg.image && (
                    <div className="h-56 overflow-hidden">
                      <img
                        src={imgUrl(pkg.image)}
                        alt={pkg.name || "Holiday package"}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="bg-gradient-to-r from-sky-600 to-cyan-500 p-6 text-white">
                    <p className="text-sm uppercase tracking-[0.24em] text-cyan-100">
                      {pkg.duration || "Holiday Package"}
                    </p>
                    <h2 className="mt-4 text-2xl font-semibold">{pkg.name}</h2>
                    <p className="mt-3 text-sm text-white/80 line-clamp-3">
                      {pkg.description ||
                        "A memorable getaway crafted just for you."}
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="mb-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
                        <MapPin className="h-4 w-4 text-sky-500" />
                        {pkg.hotel || "Hotel included"}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
                        <Briefcase className="h-4 w-4 text-slate-700" />
                        {pkg.transportation || "Transport included"}
                      </div>
                    </div>
                    <div className="space-y-3 border-t border-slate-200/70 pt-4">
                      <p className="text-sm text-slate-500">Meals:</p>
                      <p className="font-medium text-slate-900">
                        {pkg.meal || "Included"}
                      </p>
                      <p className="text-sm text-slate-500">Price / Person:</p>
                      <p className="font-semibold text-slate-900 text-lg">
                        ৳{Number(pkg.pricePerPerson || 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-500">Minimum:</p>
                      <p className="font-medium text-slate-900">
                        {pkg.minimumPerson || 1} people
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          navigate("/booking/package", { state: { pkg } })
                        }
                      >
                        Book Now
                      </Button>
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
