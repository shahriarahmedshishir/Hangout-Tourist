import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import logo from "@/assets/logo.png";
const Footer = () => {
    return (<footer className="border-t border-border bg-foreground text-background">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <img src={logo} alt="Hangout Tourist" className="h-8 w-8"/>
              <span className="font-heading text-lg font-bold">Hangout Tourist</span>
            </div>
            <p className="mb-4 text-sm opacity-70">
              Your trusted travel partner for flights, hotels, holidays, and more. Discover the world with us.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (<a key={i} href="#" className="rounded-lg bg-background/10 p-2 transition-colors hover:bg-background/20">
                  <Icon className="h-4 w-4"/>
                </a>))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-heading font-semibold">Services</h4>
            <ul className="space-y-2 text-sm opacity-70">
              {["Flights", "Hotels", "Holiday Packages", "Visa Assistance", "Car Rental", "Travel Insurance"].map((item) => (<li key={item}><a href="#" className="hover:opacity-100 transition-opacity">{item}</a></li>))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading font-semibold">Company</h4>
            <ul className="space-y-2 text-sm opacity-70">
              {["About Us", "Careers", "Blog", "Press", "Partners", "Affiliates"].map((item) => (<li key={item}><a href="#" className="hover:opacity-100 transition-opacity">{item}</a></li>))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-heading font-semibold">Contact</h4>
            <ul className="space-y-3 text-sm opacity-70">
              <li className="flex items-center gap-2"><Phone className="h-4 w-4"/> +1 (555) 123-4567</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4"/> support@hangouttourist.com</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4"/> 123 Travel Street, NY 10001</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-background/10 pt-8 text-center text-sm opacity-50">
          © 2026 Hangout Tourist. All rights reserved.
        </div>
      </div>
    </footer>);
};
export default Footer;
