import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { hotels } from "@/data/mockData";
import { Star, MapPin, SlidersHorizontal } from "lucide-react";
const Hotels = () => {
    const [sortBy, setSortBy] = useState("price");
    const sorted = [...hotels].sort((a, b) => sortBy === "price" ? a.price - b.price : b.rating - a.rating);
    return (<div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-secondary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-secondary-foreground md:text-3xl">
            Search Hotels
          </h1>
          <p className="text-secondary-foreground/80">Find your perfect stay worldwide</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Filters */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 font-heading font-bold text-foreground">
                <SlidersHorizontal className="h-4 w-4"/> Filters
              </h3>

              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-foreground">Sort By</label>
                <div className="flex flex-col gap-2">
                  {[
            { label: "Lowest Price", value: "price" },
            { label: "Highest Rating", value: "rating" },
        ].map((opt) => (<label key={opt.label} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" name="sort" checked={sortBy === opt.value} onChange={() => setSortBy(opt.value)} className="accent-primary"/>
                      {opt.label}
                    </label>))}
                </div>
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-foreground">Price Range</label>
                <div className="flex gap-2">
                  <Input placeholder="Min" type="number" className="bg-muted"/>
                  <Input placeholder="Max" type="number" className="bg-muted"/>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Star Rating</label>
                <div className="flex gap-2">
                  {[3, 4, 5].map((s) => (<button key={s} className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-accent transition-colors">
                      {s}★
                    </button>))}
                </div>
              </div>
            </div>
          </div>

          {/* Hotel Results */}
          <div className="lg:col-span-3">
            <div className="mb-4 text-sm text-muted-foreground">{sorted.length} hotels found</div>
            <div className="flex flex-col gap-5">
              {sorted.map((hotel, i) => (<div key={hotel.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:shadow-card-hover animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex flex-col md:flex-row">
                    <div className="relative h-52 w-full md:h-auto md:w-72 shrink-0">
                      <img src={hotel.image} alt={hotel.name} className="h-full w-full object-cover"/>
                      <Badge className="absolute left-3 top-3 bg-card/90 text-foreground backdrop-blur-sm">
                        {hotel.type}
                      </Badge>
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-heading text-lg font-bold text-foreground">{hotel.name}</h3>
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 fill-warning text-warning"/>
                            <span className="font-medium text-foreground">{hotel.rating}</span>
                            <span className="text-muted-foreground">({hotel.reviews})</span>
                          </div>
                        </div>
                        <p className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3"/> {hotel.location}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {hotel.amenities.map((a) => (<span key={a} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {a}
                            </span>))}
                        </div>
                      </div>
                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <span className="font-heading text-2xl font-bold text-primary">${hotel.price}</span>
                          <span className="text-sm text-muted-foreground"> / night</span>
                        </div>
                        <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                          Book Now
                        </Button>
                      </div>
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
export default Hotels;
