import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import bimanbangladesh from "../assets/biman-bangladesh-airlines.svg";
import novoair from "../assets/novoair.png";
import usbangla from "../assets/us-bangla-airlines.svg";
import airastra from "../assets/airastra.svg";
import {
  Plane,
  Phone,
  MessageCircle,
  Copy,
  Check,
  AlertCircle,
  ChevronDown,
  Star,
  Zap,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet";

const Flights = () => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [hoveredAirline, setHoveredAirline] = useState(null);

  const BOOKING_PHONE = "+8801795-606900";
  const WHATSAPP_PHONE = "+8801795-606900";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(BOOKING_PHONE);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Phone number copied to clipboard",
      duration: 2000,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const airlines = [
    {
      id: 1,
      name: "Biman Bangladesh Airlines",
      logo: bimanbangladesh,
      rating: 4.8,
      reviews: 450,
      color: "from-blue-500 to-blue-600",
      description: "National carrier with excellent service",
      routes: "50+ domestic & international routes",
      speciality: "Best for families"
    },
    {
      id: 2,
      name: "Novoair",
      logo: novoair,
      rating: 4.6,
      reviews: 320,
      color: "from-green-500 to-green-600",
      description: "Budget-friendly with great reliability",
      routes: "30+ routes across South Asia",
      speciality: "Best prices"
    },
    {
      id: 3,
      name: "US-Bangla Airlines",
      logo: usbangla,
      rating: 4.7,
      reviews: 380,
      color: "from-red-500 to-red-600",
      description: "Premium comfort with modern fleet",
      routes: "45+ domestic & international",
      speciality: "Premium experience"
    },
    {
      id: 4,
      name: "Air Astra",
      logo: airastra,
      rating: 4.5,
      reviews: 280,
      color: "from-purple-500 to-purple-600",
      description: "Quick bookings with instant confirmations",
      routes: "25+ major routes",
      speciality: "Fastest booking"
    },
  ];

  const faqs = [
    {
      question: "What airlines do you work with?",
      answer:
        "We partner with all major domestic and international airlines including Biman Bangladesh Airlines, Novoair, US-Bangla Airlines, Air Astra, and many more. Each airline offers unique benefits and competitive pricing.",
    },
    {
      question: "What are your operating hours?",
      answer:
        "Our booking team is available 24/7 to assist you. You can call or WhatsApp us anytime, and we'll respond within 2-5 minutes depending on the channel.",
    },
    {
      question: "Do you offer international flights?",
      answer:
        "Yes, we book flights to destinations across the globe including Middle East, Southeast Asia, Europe, and more. Call us for custom international flight packages with best rates.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept Cash, Credit/Debit Card, bKash, Nagad, Rocket, and bank transfers. Choose the payment method that's most convenient for you.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Hang Out Tourist | Flights</title>
      </Helmet>
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-600 relative overflow-hidden py-12 sm:py-16 md:py-24">
        {/* Animated Background Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full animate-pulse" />
        <div className="absolute -bottom-5 -right-10 w-40 h-40 sm:w-52 sm:h-52 bg-white/5 rounded-full animate-bounce" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="container relative z-10 px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12">
            {/* Left Content */}
            <div className="flex-1 animate-fade-in w-full">
              <div className="inline-flex items-center gap-2 mb-3 sm:mb-4 px-3 sm:px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse" />
                <span className="text-[11px] sm:text-sm leading-5 text-white font-semibold">Trusted by 50,000+ travelers</span>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                Book Your Flight <span className="text-orange-100">Today</span>
              </h1>

              <p className="text-orange-50 text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 leading-relaxed max-w-xl">
                Travel in comfort with our trusted flight booking service. Let our expert agents find you the best deals for your dream destination.
              </p>

              <div className="inline-block px-4 sm:px-5 py-2 sm:py-3 bg-white/15 border border-white/30 rounded-lg sm:rounded-xl backdrop-blur-sm">
                <p className="text-orange-50 text-[11px] sm:text-sm leading-5 font-medium flex items-center gap-2">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 " />
                  ✈️ Coming Soon: Online booking system
                </p>
              </div>
            </div>

            {/* Right Animation */}
            <div className="flex-1 relative h-48 sm:h-64 lg:h-96 w-full">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72">
                  {/* Orbiting circles */}
                  <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-spin" style={{ animationDuration: "20s" }} />
                  <div className="absolute inset-8 border-2 border-white/10 rounded-full animate-spin" style={{ animationDuration: "30s", animationDirection: "reverse" }} />
                  
                  {/* Center plane */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-4 sm:p-6 bg-white/10 backdrop-blur-md rounded-full">
                      <Plane className="h-12 w-12 sm:h-20 sm:w-20 lg:h-24 lg:w-24  text-white animate-bounce" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 sm:px-6 py-8 sm:py-12 md:py-16">
                {/* Direct Booking Section */}
        <div className="mb-12 sm:mb-16 ">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 sm:mb-3 text-foreground">
            Book Directly With Us
          </h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-12 text-sm sm:text-base md:text-lg px-2">
            Call or message our expert agents for instant booking assistance
          </p>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 max-w-3xl mx-auto mb-8">
            {/* Phone Call Card */}
            <div className="group rounded-lg sm:rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50 p-3 sm:p-6 md:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 animate-fade-in">
              <div className="mb-3 sm:mb-6 p-2.5 sm:p-5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl sm:rounded-2xl inline-flex shadow-lg group-hover:shadow-xl transition-shadow">
                <Phone className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
              </div>

              <h3 className="font-heading text-base sm:text-xl md:text-2xl font-bold text-foreground mb-2 sm:mb-3">
                Call Us Now
              </h3>
              <p className="text-[11px] sm:text-sm leading-5 text-muted-foreground mb-3 sm:mb-6 md:mb-8">
                Speak directly with our flight booking agents for instant assistance
              </p>

              <div className="mb-3 sm:mb-6 md:mb-8 p-2.5 sm:p-5 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl sm:rounded-2xl border-2 border-orange-300">
                <div className="text-xs text-orange-700 font-bold mb-2 sm:mb-3 uppercase tracking-wide">
                  📞 Phone Number
                </div>
                <div className="text-base sm:text-3xl md:text-2xl font-bold text-orange-600 font-mono tracking-tight break-all">
                  {BOOKING_PHONE}
                </div>
              </div>

              <div className="space-y-2 mb-3 sm:mb-6">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105 h-9 sm:h-12 md:h-14 text-xs sm:text-base"
                  onClick={() =>
                    (window.location.href = `tel:${BOOKING_PHONE}`)
                  }
                >
                  <Phone className="mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  Call Now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-orange-300 text-orange-600 hover:bg-orange-50 font-semibold h-9 sm:h-12 md:h-14 text-xs sm:text-base"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5" />
                      Copy Number
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-3 sm:pt-6 border-t-2 border-orange-200 space-y-1 sm:space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                  <p className="text-[11px] sm:text-sm leading-5 font-semibold text-orange-700">Available: 24/7</p>
                </div>
                <p className="text-xs text-muted-foreground pl-5.5">
                  Response time: Within 2 minutes
                </p>
              </div>
            </div>

            {/* WhatsApp Card */}
            <div className="group rounded-lg sm:rounded-2xl border-2 border-green-200 bg-gradient-to-br from-white to-green-50 p-3 sm:p-6 md:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              <div className="mb-3 sm:mb-6 p-2.5 sm:p-5 bg-gradient-to-r from-green-400 to-green-600 rounded-xl sm:rounded-2xl inline-flex shadow-lg group-hover:shadow-xl transition-shadow">
                <MessageCircle className="h-5 w-5 sm:h-8 sm:w-8 text-white" />
              </div>

              <h3 className="font-heading text-base sm:text-xl md:text-2xl font-bold text-foreground mb-2 sm:mb-3">
                WhatsApp Us
              </h3>
              <p className="text-[11px] sm:text-sm leading-5 text-muted-foreground mb-3 sm:mb-6 md:mb-8">
                Quick messaging for flight booking inquiries and quotes
              </p>

              <div className="mb-3 sm:mb-6 md:mb-8 p-2.5 sm:p-5 bg-gradient-to-br from-green-100 to-green-200 rounded-xl sm:rounded-2xl border-2 border-green-300">
                <div className="text-xs text-green-700 font-bold mb-2 sm:mb-3 uppercase tracking-wide">
                  💬 WhatsApp Number
                </div>
                <div className="text-base sm:text-3xl md:text-2xl font-bold text-green-600 font-mono tracking-tight break-all">
                  {BOOKING_PHONE}
                </div>
              </div>

              <div className="space-y-2 mb-3 sm:mb-6">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105 text-sm sm:text-base  py-4 sm:py-5 md:py-6"
                  onClick={() =>
                    window.open(
                      `https://wa.me/${WHATSAPP_PHONE}?text=Hi! I want to book a flight with Hangout Tourist.`,
                      "_blank"
                    )
                  }
                >
                  <MessageCircle className="mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  WhatsApp Now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-green-300 text-green-600 hover:bg-green-50 font-semibold h-9 sm:h-12 md:h-14 text-xs sm:text-base"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5" />
                      Copy Number
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-3 sm:pt-6 border-t-2 border-green-200 space-y-1 sm:space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                  <p className="text-[11px] sm:text-sm leading-5 font-semibold text-green-700">Available: 24/7</p>
                </div>
                <p className="text-xs text-muted-foreground pl-5.5">
                  Response time: Within 5 minutes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Airlines Section */}
        <div className="mb-12 sm:mb-16">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-4">
              Partner Airlines
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
              We work with the best airlines to bring you reliable service and competitive pricing
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {airlines.map((airline, idx) => (
              <div
                key={airline.id}
                className="group relative rounded-lg sm:rounded-xl md:rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-4 sm:p-6 md:p-8 shadow-md hover:shadow-xl md:hover:shadow-2xl transition-all duration-500 overflow-hidden animate-fade-in transform hover:-translate-y-2 md:hover:-translate-y-3 hover:border-orange-300"
                style={{ animationDelay: `${idx * 0.1}s` }}
                onMouseEnter={() => setHoveredAirline(airline.id)}
                onMouseLeave={() => setHoveredAirline(null)}
              >
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${airline.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                {/* Content */}
                <div className="relative z-10">
                  {/* Logo Header */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4 md:mb-6 gap-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-24 md:h-24  sm:rounded-xl flex items-center justify-center overflow-hidden  flex-shrink-0">
                      <img
                        src={airline.logo}
                        alt={airline.name}
                        className="w-full h-full object-contain p-1 sm:p-2"
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' font-size='40' fill='%23999'%3E✈️%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-0.5 bg-yellow-100 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-sm flex-shrink-0">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-[11px] sm:text-sm leading-5 font-bold text-yellow-700">{airline.rating}</span>
                    </div>
                  </div>

                  {/* Airline Name */}
                  <h3 className="font-heading text-sm sm:text-base md:text-lg font-bold text-foreground mb-1 sm:mb-2 leading-tight line-clamp-2">
                    {airline.name}
                  </h3>

                  {/* Description */}
                  <p className="text-[11px] sm:text-sm leading-5 text-muted-foreground mb-2 sm:mb-3 md:mb-4 line-clamp-2">
                    {airline.description}
                  </p>

                  {/* Routes */}
                  <div className="flex items-center gap-1.5 mb-2 sm:mb-3 md:mb-4 text-[11px] sm:text-sm leading-5 text-orange-700 font-medium">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="line-clamp-1">{airline.routes}</span>
                  </div>

                  {/* Speciality Badge */}
                  <div className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 rounded-full mb-2 sm:mb-3 md:mb-6">
                    <p className="text-xs font-semibold text-orange-700">{airline.speciality}</p>
                  </div>

                  {/* Reviews - Hidden on small devices */}
                  <div className="mb-2 sm:mb-3 md:mb-6 pb-2 sm:pb-3 md:pb-6 border-b border-orange-200 hidden sm:block">
                    <p className="text-xs text-muted-foreground">
                      {airline.reviews} customer reviews
                    </p>
                  </div>

                  {/* Stats - Compact on small devices */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
                    <div className="p-2 sm:p-3 bg-orange-100/50 rounded-lg text-center hover:bg-orange-100 transition">
                      <p className="text-xs text-muted-foreground mb-0.5">Reliability</p>
                      <p className="text-[11px] sm:text-sm leading-5 font-bold text-orange-700">{(airline.rating * 20).toFixed(0)}%</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-orange-100/50 rounded-lg text-center hover:bg-orange-100 transition">
                      <p className="text-xs text-muted-foreground mb-0.5">Rating</p>
                      <p className="text-[11px] sm:text-sm leading-5 font-bold text-orange-700">{airline.rating}/5</p>
                    </div>
                  </div>
                </div>

                {/* Hover Indicator */}
                <div className={`absolute top-2 right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full transition-all duration-300 ${hoveredAirline === airline.id ? "animate-pulse" : ""}`} />
              </div>
            ))}
          </div>
        </div>



        {/* Why Book With Us */}
        <div className="mb-12 sm:mb-16 max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-4">
              Why Book Through Our Agents?
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
              Experience the difference with our professional flight booking service
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🎯",
                title: "Best Price Guarantee",
                description:
                  "We negotiate directly with airlines to get you the lowest fares. Special discounts not available online!",
              },
              {
                icon: "⚡",
                title: "Instant Confirmation",
                description:
                  "Receive booking confirmation and complete itinerary via SMS and email within minutes.",
              },
              {
                icon: "🛡️",
                title: "Secure Booking",
                description:
                  "100% safe and secure transactions with encrypted payment processing.",
              },
              {
                icon: "💳",
                title: "Multiple Payment Options",
                description:
                  "Cash, Card, bKash, Nagad, Rocket, and bank transfers available.",
              },
              {
                icon: "🌍",
                title: "Global Destinations",
                description:
                  "Book flights to anywhere in the world with competitive international rates.",
              },
              {
                icon: "👨‍💼",
                title: "Expert Advice",
                description:
                  "Get personalized recommendations on routes, airlines, and travel dates.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg sm:rounded-xl md:rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-5 sm:p-6 md:p-8 hover:shadow-xl hover:border-orange-300 transition-all duration-300 animate-fade-in transform hover:-translate-y-2"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <div className="text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">{item.icon}</div>
                <h3 className="font-heading text-base sm:text-lg md:text-lg font-bold mb-2 sm:mb-3 text-foreground">
                  {item.title}
                </h3>
                <p className="text-[11px] sm:text-sm leading-5 text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Process */}
        <div className="mb-12 sm:mb-16 max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 text-foreground">
            Simple 4-Step Booking Process
          </h2>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent" />

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-8">
              {[
                { step: 1, title: "📞 Call/Message", desc: "Contact us via phone or WhatsApp" },
                { step: 2, title: "✍️ Share Details", desc: "Tell us your travel preferences" },
                { step: 3, title: "💰 Get Quote", desc: "Receive the best flight options" },
                { step: 4, title: "✅ Book & Pay", desc: "Confirm and complete payment" },
              ].map((item) => (
                <div key={item.step} className="relative animate-fade-in" style={{ animationDelay: `${item.step * 0.15}s` }}>
                  <div className="flex flex-col items-center text-center">
                    <div className="relative z-10 mb-2 sm:mb-3 md:mb-4 group">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-20 md:w-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm sm:text-base md:text-2xl shadow-lg md:shadow-xl group-hover:shadow-2xl transition-all transform group-hover:scale-110">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="font-heading font-bold text-[11px] sm:text-sm leading-5 md:text-lg mb-1 sm:mb-2 text-foreground line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-xs md:text-sm text-muted-foreground leading-tight sm:leading-relaxed line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-12 sm:mb-16 max-w-3xl mx-auto">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 text-foreground">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-lg sm:rounded-xl md:rounded-2xl border border-orange-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <button
                  onClick={() =>
                    setExpandedFaq(expandedFaq === idx ? null : idx)
                  }
                  className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-orange-50 transition-colors group gap-2"
                >
                  <h3 className="font-semibold text-foreground text-left text-xs sm:text-base md:text-lg">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`h-3.5 w-3.5 sm:h-5 sm:w-5 text-orange-600 transition-transform duration-300 flex-shrink-0 group-hover:text-orange-700 ${
                      expandedFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedFaq === idx && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t-2 border-orange-100 bg-gradient-to-br from-orange-50 to-white animate-in fade-in slide-in-from-top-2">
                    <p className="text-[11px] sm:text-sm leading-5 text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-600 p-8 sm:p-12 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-40 sm:h-40 bg-white/10 rounded-full -mr-16 sm:-mr-20 -mt-16 sm:-mt-20" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -ml-12 sm:-ml-16 -mb-12 sm:-mb-16" />
          
          <div className="relative z-10">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Ready to Book Your Flight?
            </h2>
            <p className="text-orange-50 mb-6 sm:mb-8 md:mb-10 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed px-2">
              Don't wait! Call or WhatsApp us now for instant assistance, exclusive deals, and personalized recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
              <Button
                size="lg"
                className="bg-white text-orange-600 font-bold hover:bg-orange-50 shadow-lg hover:shadow-xl text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6"
                onClick={() =>
                  (window.location.href = `tel:${BOOKING_PHONE}`)
                }
              >
                <Phone className="mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5" />
                Call Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-orange-600 hover:text-white hover:bg-white/10 font-bold shadow-lg hover:shadow-xl text-sm sm:text-base px-6 sm:px-8 py-4 sm:py-6"
                onClick={() =>
                  window.open(
                    `https://wa.me/${WHATSAPP_PHONE}?text=Hi! I want to book a flight with Hangout Tourist.`,
                    "_blank"
                  )
                }
              >
                <MessageCircle className="mr-2 h-3.5 w-3.5 sm:h-5 sm:w-5" />
                WhatsApp Us
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Flights;