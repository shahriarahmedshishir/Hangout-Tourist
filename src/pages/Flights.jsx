import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Plane, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const Flights = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && user.role === "hotel_staff") {
      navigate("/staff", { replace: true });
    }
  }, [user, loading, navigate]);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Coming Soon */}
      <div className="relative min-h-[420px] bg-gradient-primary flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative z-10 text-center text-white px-4 animate-fade-in">
          <div className="mb-5 flex justify-center">
            <span className="rounded-full bg-white/20 p-5 backdrop-blur">
              <Plane className="h-12 w-12 text-white" />
            </span>
          </div>
          <div className="mb-2 flex items-center justify-center gap-3">
            <Clock className="h-7 w-7 text-yellow-300 animate-pulse" />
            <h1 className="font-heading text-5xl font-extrabold tracking-tight">
              Coming Soon
            </h1>
          </div>
          <p className="mt-3 text-lg text-white/80 max-w-md mx-auto">
            Flight booking is under development and will be available soon. Stay
            tuned for great deals!
          </p>
          <Link
            to="/"
            className="mt-8 inline-block rounded-xl bg-white text-primary font-semibold px-6 py-2.5 hover:bg-white/90 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default Flights;
