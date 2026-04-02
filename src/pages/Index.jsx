import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import HotelsSection from "@/components/home/HotelsSection";
import PopularCars from "@/components/home/PopularCars";
import ExclusiveOffers from "@/components/home/ExclusiveOffers";
import WhyChooseUs from "@/components/home/WhyChooseUs";
const Index = () => {
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
      <HeroSection />
      <HotelsSection />
      <PopularCars />
      <ExclusiveOffers />
      <WhyChooseUs />
      <Footer />
    </div>
  );
};
export default Index;
