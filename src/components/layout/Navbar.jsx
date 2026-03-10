import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
const navLinks = [
    { path: "/flights", label: "Flights" },
    { path: "/hotels", label: "Hotels" },
    { path: "/holidays", label: "Holidays" },
    { path: "/visa", label: "Visa" },
    { path: "/cars", label: "Cars" },
];
const Navbar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    return (<nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Hangout Tourist" className="h-9 w-9"/>
          <span className="font-heading text-xl font-bold text-foreground">
            Hangout <span className="text-gradient-primary">Tourist</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (<Link key={link.path} to={link.path} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${location.pathname === link.path
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"}`}>
              {link.label}
            </Link>))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4"/> Login
            </Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              Sign Up
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6"/> : <Menu className="h-6 w-6"/>}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (<div className="border-t border-border bg-background p-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (<Link key={link.path} to={link.path} onClick={() => setMobileOpen(false)} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent ${location.pathname === link.path ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
                {link.label}
              </Link>))}
            <hr className="my-2 border-border"/>
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <User className="h-4 w-4"/> Login
              </Button>
            </Link>
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-gradient-primary text-primary-foreground">Sign Up</Button>
            </Link>
          </div>
        </div>)}
    </nav>);
};
export default Navbar;
