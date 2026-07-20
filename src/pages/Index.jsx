import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import HotelsSection from "@/components/home/HotelsSection";
import PopularCars from "@/components/home/PopularCars";
import PopularPackages from "@/components/home/PopularPackages";
import ExclusiveOffers from "@/components/home/ExclusiveOffers";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import { Helmet } from "react-helmet";
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
      <Helmet>
        <meta charSet="utf-8" />
        <title>Hang Out Tourist - Flights, Hotels & Holiday Packages</title>
      </Helmet>
      <Navbar />
      <HeroSection />
      <HotelsSection />
      <PopularCars />
      <PopularPackages />
      <ExclusiveOffers />
      <WhyChooseUs />
      <Footer />
    </div>
  );
};
export default Index;
