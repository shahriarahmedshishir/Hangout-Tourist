import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flights } from "@/data/mockData";
import { Plane, SlidersHorizontal } from "lucide-react";
const Flights = () => {
    const [sortBy, setSortBy] = useState("price");
    const [stopsFilter, setStopsFilter] = useState(null);
    const filtered = flights
        .filter((f) => stopsFilter === null || f.stops === stopsFilter)
        .sort((a, b) => (sortBy === "price" ? a.price - b.price : 0));
    return (<div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-primary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-primary-foreground md:text-3xl">
            Search Flights
          </h1>
          <p className="text-primary-foreground/80">New York (JFK) → Paris (CDG)</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 font-heading font-bold text-foreground">
                <SlidersHorizontal className="h-4 w-4"/> Filters
              </h3>
              
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-foreground">Stops</label>
                <div className="flex flex-col gap-2">
                  {[
            { label: "All", value: null },
            { label: "Non-stop", value: 0 },
            { label: "1 Stop", value: 1 },
        ].map((opt) => (<label key={opt.label} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" name="stops" checked={stopsFilter === opt.value} onChange={() => setStopsFilter(opt.value)} className="accent-primary"/>
                      {opt.label}
                    </label>))}
                </div>
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-foreground">Sort By</label>
                <div className="flex flex-col gap-2">
                  {[
            { label: "Lowest Price", value: "price" },
            { label: "Duration", value: "duration" },
        ].map((opt) => (<label key={opt.label} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" name="sort" checked={sortBy === opt.value} onChange={() => setSortBy(opt.value)} className="accent-primary"/>
                      {opt.label}
                    </label>))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Price Range</label>
                <div className="flex gap-2">
                  <Input placeholder="Min" type="number" className="bg-muted"/>
                  <Input placeholder="Max" type="number" className="bg-muted"/>
                </div>
              </div>
            </div>
          </div>

          {/* Flight Results */}
          <div className="lg:col-span-3">
            <div className="mb-4 text-sm text-muted-foreground">
              {filtered.length} flights found
            </div>

            <div className="flex flex-col gap-4">
              {filtered.map((flight, i) => (<div key={flight.id} className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                        <Plane className="h-6 w-6 text-accent-foreground"/>
                      </div>
                      <div>
                        <p className="font-heading font-bold text-foreground">{flight.airline}</p>
                        <p className="text-xs text-muted-foreground">{flight.flightNo} · {flight.class}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="font-heading text-lg font-bold text-foreground">{flight.departure}</p>
                        <p className="text-xs text-muted-foreground">JFK</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <p className="text-xs text-muted-foreground">{flight.duration}</p>
                        <div className="flex items-center gap-1">
                          <div className="h-px w-12 bg-border"/>
                          <Plane className="h-3 w-3 text-primary"/>
                          <div className="h-px w-12 bg-border"/>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {flight.stops === 0 ? "Non-stop" : `${flight.stops} Stop`}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-heading text-lg font-bold text-foreground">{flight.arrival}</p>
                        <p className="text-xs text-muted-foreground">CDG</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-heading text-2xl font-bold text-primary">${flight.price}</p>
                        <p className="text-xs text-muted-foreground">per person</p>
                      </div>
                      <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                        Book Now
                      </Button>
                    </div>
                  </div>
                </div>))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>);
};
export default Flights;
