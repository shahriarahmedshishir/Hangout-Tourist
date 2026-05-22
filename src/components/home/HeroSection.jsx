import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Building2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroBg from "@/assets/hero-bg.jpg";
const tabs = [
  { id: "hotel", label: "Hotel", icon: Building2 },
  { id: "cars", label: "Cars", icon: Car },
];
const HeroSection = () => {
  const [activeTab, setActiveTab] = useState("hotel");
  const navigate = useNavigate();
  const [hotelQuery, setHotelQuery] = useState("");
  const [carQuery, setCarQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const [hotelsRes, carsRes] = await Promise.all([
          api.get("/api/hotels").catch(() => []),
          api.get("/api/cars").catch(() => []),
        ]);
        const hotelList = Array.isArray(hotelsRes)
          ? hotelsRes
          : hotelsRes || [];
        const carList = Array.isArray(carsRes) ? carsRes : carsRes || [];
        const items = new Set();
        hotelList.forEach((h) => {
          if (h.area) items.add(h.area);
          if (h.name) items.add(h.name);
        });
        carList.forEach((c) => {
          if (c.places?.length) c.places.forEach((p) => items.add(p));
          if (c.name) items.add(c.name);
        });
        setSuggestions(Array.from(items).filter(Boolean));
      } catch (err) {
        // ignore
      }
    };
    loadSuggestions();
  }, []);

  const normalize = (s = "") =>
    String(s)
      .toLowerCase()
      .replace(/[\u2018\u2019'`’]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleSearch = () => {
    if (activeTab === "hotel")
      navigate(`/hotels?q=${encodeURIComponent(hotelQuery)}`);
    else if (activeTab === "cars")
      navigate(`/cars?q=${encodeURIComponent(carQuery)}`);
  };
  return (
    <section className="relative min-h-[560px] overflow-hidden">
      <img
        src={heroBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-hero" />

      <div className="container relative z-10 flex flex-col items-center pb-12 pt-16 text-center">
        <h1 className="mb-3 font-heading text-4xl font-extrabold tracking-tight text-background md:text-5xl lg:text-6xl animate-fade-in">
          Welcome to{" "}
          <span className="text-gradient-primary">Hang Out Tourist!</span>
        </h1>
        <p
          className="mb-10 text-lg text-background/80 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          Find Flights, Hotels, Visa & Holidays at the best prices
        </p>

        {/* Search Card */}
        <div
          className="w-full max-w-4xl animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="rounded-2xl bg-card shadow-elevated">
            {/* Tabs */}
            <div className="flex border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === "hotel" && (
                <div className="grid gap-3 md:grid-cols-2" ref={containerRef}>
                  <div className="relative">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Destination
                    </label>
                    <Input
                      placeholder="Where are you going?"
                      className="bg-muted"
                      value={hotelQuery}
                      onChange={(e) => {
                        setHotelQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    {showSuggestions && hotelQuery && (
                      <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card shadow-lg">
                        {suggestions
                          .filter((s) =>
                            normalize(s).includes(normalize(hotelQuery)),
                          )
                          .slice(0, 8)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setHotelQuery(s);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-muted"
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleSearch}
                      className="w-full gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      <Search className="h-4 w-4" /> Search
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "cars" && (
                <div className="grid gap-3 md:grid-cols-2" ref={containerRef}>
                  <div className="relative">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Pick-up Location
                    </label>
                    <Input
                      placeholder="Where to pick up?"
                      className="bg-muted"
                      value={carQuery}
                      onChange={(e) => {
                        setCarQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    {showSuggestions && carQuery && (
                      <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card shadow-lg">
                        {suggestions
                          .filter((s) =>
                            normalize(s).includes(normalize(carQuery)),
                          )
                          .slice(0, 8)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setCarQuery(s);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-muted"
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleSearch}
                      className="w-full gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90"
                    >
                      <Search className="h-4 w-4" /> Search
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default HeroSection;
