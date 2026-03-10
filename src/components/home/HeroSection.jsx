import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Building2, Palmtree, ArrowRightLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroBg from "@/assets/hero-bg.jpg";
const tabs = [
    { id: "flight", label: "Flight", icon: Plane },
    { id: "hotel", label: "Hotel", icon: Building2 },
    { id: "holiday", label: "Holiday", icon: Palmtree },
];
const HeroSection = () => {
    const [activeTab, setActiveTab] = useState("flight");
    const [tripType, setTripType] = useState("round-trip");
    const navigate = useNavigate();
    const handleSearch = () => {
        if (activeTab === "flight")
            navigate("/flights");
        else if (activeTab === "hotel")
            navigate("/hotels");
        else
            navigate("/holidays");
    };
    return (<section className="relative min-h-[560px] overflow-hidden">
      <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover"/>
      <div className="absolute inset-0 bg-gradient-hero"/>

      <div className="container relative z-10 flex flex-col items-center pb-12 pt-16 text-center">
        <h1 className="mb-3 font-heading text-4xl font-extrabold tracking-tight text-background md:text-5xl lg:text-6xl animate-fade-in">
          Welcome to <span className="text-gradient-primary">Hangout Tourist!</span>
        </h1>
        <p className="mb-10 text-lg text-background/80 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Find Flights, Hotels, Visa & Holidays at the best prices
        </p>

        {/* Search Card */}
        <div className="w-full max-w-4xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-2xl bg-card shadow-elevated">
            {/* Tabs */}
            <div className="flex border-b border-border">
              {tabs.map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"}`}>
                  <tab.icon className="h-4 w-4"/>
                  {tab.label}
                </button>))}
            </div>

            <div className="p-5">
              {activeTab === "flight" && (<>
                  {/* Trip type */}
                  <div className="mb-4 flex gap-4">
                    {["one-way", "round-trip", "multi-city"].map((type) => (<label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" name="trip" checked={tripType === type} onChange={() => setTripType(type)} className="accent-primary"/>
                        <span className="capitalize">{type.replace("-", " ")}</span>
                      </label>))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-5">
                    <div className="md:col-span-1">
                      <label className="mb-1 block text-xs text-muted-foreground">From</label>
                      <Input placeholder="New York (JFK)" className="bg-muted"/>
                    </div>
                    <div className="flex items-end justify-center">
                      <button className="mb-1 rounded-full border border-border p-2 text-primary hover:bg-accent transition-colors">
                        <ArrowRightLeft className="h-4 w-4"/>
                      </button>
                    </div>
                    <div className="md:col-span-1">
                      <label className="mb-1 block text-xs text-muted-foreground">To</label>
                      <Input placeholder="Paris (CDG)" className="bg-muted"/>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                      <Input type="date" className="bg-muted"/>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSearch} className="w-full gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90">
                        <Search className="h-4 w-4"/> Search
                      </Button>
                    </div>
                  </div>
                </>)}

              {activeTab === "hotel" && (<div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Destination</label>
                    <Input placeholder="Where are you going?" className="bg-muted"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Check-in</label>
                    <Input type="date" className="bg-muted"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Check-out</label>
                    <Input type="date" className="bg-muted"/>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleSearch} className="w-full gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90">
                      <Search className="h-4 w-4"/> Search
                    </Button>
                  </div>
                </div>)}

              {activeTab === "holiday" && (<div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Destination</label>
                    <Input placeholder="Where do you want to go?" className="bg-muted"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Travel Date</label>
                    <Input type="date" className="bg-muted"/>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleSearch} className="w-full gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90">
                      <Search className="h-4 w-4"/> Search
                    </Button>
                  </div>
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </section>);
};
export default HeroSection;
