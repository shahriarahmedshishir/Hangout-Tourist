import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { FileCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const visaCountries = [
    { country: "United States", processingTime: "5-7 Business Days", fee: 160, type: "Tourist Visa" },
    { country: "United Kingdom", processingTime: "3-5 Business Days", fee: 130, type: "Standard Visitor" },
    { country: "Schengen (Europe)", processingTime: "10-15 Business Days", fee: 90, type: "Short Stay" },
    { country: "Canada", processingTime: "7-10 Business Days", fee: 100, type: "Visitor Visa" },
    { country: "Australia", processingTime: "5-10 Business Days", fee: 150, type: "eVisitor" },
    { country: "Japan", processingTime: "5-7 Business Days", fee: 25, type: "Tourist Visa" },
];
const Visa = () => {
    return (<div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-gradient-secondary py-8">
        <div className="container">
          <h1 className="font-heading text-2xl font-bold text-secondary-foreground md:text-3xl">
            Visa Assistance
          </h1>
          <p className="text-secondary-foreground/80">Get your visa processed quickly and hassle-free</p>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-8 flex max-w-md gap-3">
          <Input placeholder="Search country..." className="bg-muted"/>
          <Button className="bg-gradient-primary text-primary-foreground">Search</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visaCountries.map((v, i) => (<div key={v.country} className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-xl bg-accent p-2">
                  <FileCheck className="h-5 w-5 text-accent-foreground"/>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-foreground">{v.country}</h3>
                  <p className="text-xs text-muted-foreground">{v.type}</p>
                </div>
              </div>
              <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                <p>Processing: {v.processingTime}</p>
                <p>Fee: <span className="font-semibold text-primary">${v.fee}</span></p>
              </div>
              <Button variant="outline" className="w-full gap-1" size="sm">
                Apply Now <ArrowRight className="h-3 w-3"/>
              </Button>
            </div>))}
        </div>
      </div>
      <Footer />
    </div>);
};
export default Visa;
