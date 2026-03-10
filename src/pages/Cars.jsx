import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Fuel, Settings2 } from "lucide-react";
const cars = [
    { id: 1, name: "Toyota Corolla", type: "Sedan", seats: 5, transmission: "Automatic", fuel: "Petrol", price: 45, image: "🚗" },
    { id: 2, name: "Honda CR-V", type: "SUV", seats: 5, transmission: "Automatic", fuel: "Petrol", price: 65, image: "🚙" },
    { id: 3, name: "Mercedes C-Class", type: "Luxury", seats: 5, transmission: "Automatic", fuel: "Petrol", price: 120, image: "🏎️" },
    { id: 4, name: "Toyota HiAce", type: "Van", seats: 12, transmission: "Manual", fuel: "Diesel", price: 85, image: "🚐" },
    { id: 5, name: "BMW 5 Series", type: "Luxury", seats: 5, transmission: "Automatic", fuel: "Petrol", price: 150, image: "🚘" },
    { id: 6, name: "Hyundai i10", type: "Economy", seats: 4, transmission: "Manual", fuel: "Petrol", price: 25, image: "🚕" },
];
const Cars = () => {
    return (<div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-primary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-primary-foreground md:text-3xl">Car Rental</h1>
          <p className="text-primary-foreground/80">Rent a car for your trip at the best rates</p>
        </div>
      </div>

      <div className="container py-8">
        {/* Search */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Pick-up Location</label>
              <Input placeholder="City or Airport" className="bg-muted"/>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Pick-up Date</label>
              <Input type="date" className="bg-muted"/>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Return Date</label>
              <Input type="date" className="bg-muted"/>
            </div>
            <div className="flex items-end">
              <Button className="w-full bg-gradient-primary text-primary-foreground">Search Cars</Button>
            </div>
          </div>
        </div>

        {/* Car Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cars.map((car, i) => (<div key={car.id} className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="mb-4 flex h-28 items-center justify-center rounded-xl bg-muted text-5xl">
                {car.image}
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">{car.name}</h3>
              <p className="mb-3 text-xs text-muted-foreground">{car.type}</p>
              <div className="mb-4 flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3"/> {car.seats}</span>
                <span className="flex items-center gap-1"><Settings2 className="h-3 w-3"/> {car.transmission}</span>
                <span className="flex items-center gap-1"><Fuel className="h-3 w-3"/> {car.fuel}</span>
              </div>
              <div className="flex items-end justify-between border-t border-border pt-3">
                <div>
                  <span className="font-heading text-xl font-bold text-primary">${car.price}</span>
                  <span className="text-sm text-muted-foreground"> /day</span>
                </div>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground">Rent Now</Button>
              </div>
            </div>))}
        </div>
      </div>
      <Footer />
    </div>);
};
export default Cars;
