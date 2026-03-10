import { MapPin, Star, Plane } from "lucide-react";
import { destinations } from "@/data/mockData";
const PopularDestinations = () => {
    return (<section className="py-16">
      <div className="container">
        <div className="mb-10 text-center">
          <h2 className="mb-2 font-heading text-3xl font-bold text-foreground">
            Popular Destinations
          </h2>
          <p className="text-muted-foreground">Explore our most loved travel spots around the world</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest, i) => (<div key={dest.id} className="group cursor-pointer overflow-hidden rounded-2xl bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="relative h-52 overflow-hidden">
                <img src={dest.image} alt={dest.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-card/90 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <Star className="h-3 w-3 fill-warning text-warning"/>
                  {dest.rating}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-heading text-lg font-bold text-foreground">{dest.name}</h3>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3"/> {dest.country}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    <Plane className="mr-1 inline h-3 w-3"/>{dest.flights} flights
                  </span>
                  <span className="font-heading text-lg font-bold text-primary">
                    From ${dest.price}
                  </span>
                </div>
              </div>
            </div>))}
        </div>
      </div>
    </section>);
};
export default PopularDestinations;
