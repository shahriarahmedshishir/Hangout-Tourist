import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { holidays } from "@/data/mockData";
import { Star, Clock, Check, MapPin } from "lucide-react";
const Holidays = () => {
    return (<div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-primary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-primary-foreground md:text-3xl">
            Holiday Packages
          </h1>
          <p className="text-primary-foreground/80">Curated travel packages for unforgettable experiences</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {holidays.map((pkg, i) => (<div key={pkg.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="relative h-52 overflow-hidden">
                <img src={pkg.image} alt={pkg.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                <Badge className="absolute right-3 top-3 bg-destructive text-destructive-foreground">
                  {Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)}% OFF
                </Badge>
              </div>

              <div className="p-5">
                <h3 className="mb-1 font-heading text-lg font-bold text-foreground">{pkg.title}</h3>
                <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {pkg.destination}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> {pkg.duration}</span>
                </div>

                <div className="mb-3 flex items-center gap-1">
                  <Star className="h-4 w-4 fill-warning text-warning"/>
                  <span className="text-sm font-medium text-foreground">{pkg.rating}</span>
                </div>

                <div className="mb-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Includes:</p>
                  <div className="flex flex-wrap gap-1">
                    {pkg.includes.map((item) => (<span key={item} className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                        <Check className="h-2.5 w-2.5"/> {item}
                      </span>))}
                  </div>
                </div>

                <div className="flex items-end justify-between border-t border-border pt-4">
                  <div>
                    <span className="text-sm text-muted-foreground line-through">${pkg.originalPrice}</span>
                    <span className="ml-2 font-heading text-2xl font-bold text-primary">${pkg.price}</span>
                    <span className="text-sm text-muted-foreground"> /person</span>
                  </div>
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                    Book Now
                  </Button>
                </div>
              </div>
            </div>))}
        </div>
      </div>
      <Footer />
    </div>);
};
export default Holidays;
