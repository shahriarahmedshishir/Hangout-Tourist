import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import PopularDestinations from "@/components/home/PopularDestinations";
import ExclusiveOffers from "@/components/home/ExclusiveOffers";
import WhyChooseUs from "@/components/home/WhyChooseUs";
const Index = () => {
    return (<div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <PopularDestinations />
      <ExclusiveOffers />
      <WhyChooseUs />
      <Footer />
    </div>);
};
export default Index;
