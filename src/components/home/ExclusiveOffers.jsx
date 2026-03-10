import { Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { offers } from "@/data/mockData";
const badgeColors = {
    "Hot Deal": "bg-destructive text-destructive-foreground",
    "Student": "bg-secondary text-secondary-foreground",
    "EMI": "bg-success text-success-foreground",
};
const ExclusiveOffers = () => {
    return (<section className="bg-muted py-16">
      <div className="container">
        <div className="mb-10 text-center">
          <h2 className="mb-2 font-heading text-3xl font-bold text-foreground">
            Exclusive Offers
          </h2>
          <p className="text-muted-foreground">Save big on your next adventure with our special deals</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {offers.map((offer, i) => (<div key={offer.id} className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-full bg-accent p-2">
                  <Tag className="h-5 w-5 text-accent-foreground"/>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColors[offer.badge] || "bg-primary text-primary-foreground"}`}>
                  {offer.badge}
                </span>
              </div>
              <h3 className="mb-2 font-heading text-lg font-bold text-foreground">{offer.title}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{offer.description}</p>
              <Button variant="ghost" className="gap-1 p-0 text-primary hover:text-primary/80">
                View Details <ArrowRight className="h-4 w-4"/>
              </Button>
            </div>))}
        </div>
      </div>
    </section>);
};
export default ExclusiveOffers;
