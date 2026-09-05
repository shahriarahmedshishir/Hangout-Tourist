import { Shield, Headphones, DollarSign, Globe } from "lucide-react";
const features = [
    { icon: DollarSign, title: "Best Price Guarantee", desc: "We guarantee the lowest prices on all flights and hotels." },
    { icon: Shield, title: "Secure Booking", desc: "Your data and payments are protected with industry-leading security." },
    { icon: Headphones, title: "24/7 Support", desc: "Our travel experts are available around the clock to help you." },
    
];
const WhyChooseUs = () => {
    return (<section className="py-16">
      <div className="container">
        <div className="mb-10 text-center">
          <h2 className="mb-2 font-heading text-3xl font-bold text-foreground">
            Why Choose Hangout Tourist?
          </h2>
          <p className="text-muted-foreground">The best travel experience starts with us</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (<div key={i} className="rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary">
                <f.icon className="h-7 w-7 text-primary-foreground"/>
              </div>
              <h3 className="mb-2 font-heading text-base font-bold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>))}
        </div>
      </div>
    </section>);
};
export default WhyChooseUs;
