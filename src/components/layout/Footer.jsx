import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
} from "lucide-react";
import logo from "@/assets/ht.png";

const navLinks = [
  { path: "/hotels", label: "Hotels" },
  { path: "/cars", label: "Cars" },
  { path: "/flight", label: "Flight" },
  { path: "/holidays", label: "Holidays" },
];

const paymentMethods = [
  // --- MFS & Wallets ---
  {
    name: "bkash",
    label: "bKash",
    src: "https://static.vecteezy.com/system/resources/previews/068/842/080/non_2x/bkash-logo-horizontal-mobile-banking-app-icon-emblem-transparent-background-free-png.png",
  },
  {
    name: "nagad",
    label: "Nagad",
    src: "https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png",
  },
  {
    name: "rocket",
    label: "Rocket",
    src: "https://images.seeklogo.com/logo-png/31/1/dutch-bangla-rocket-logo-png_seeklogo-317692.png",
  },
  {
    name: "upay",
    label: "Upay",
    src: "https://i.ibb.co.com/5gR8g4LD/upay.jpg",
  },

  // --- Card Schemes (International & Local) ---
  {
    name: "visa",
    label: "Visa",
    src: "https://upload.wikimedia.org/wikipedia/commons/d/d3/Visa_Inc._logo_%282005%E2%80%932014%29.png",
  },
  {
    name: "mastercard",
    label: "MasterCard",
    src: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
  },
  {
    name: "citybank",
    label: "City Bank",
    src: "https://i.ibb.co.com/9HDQ3tmw/city-bank.jpg",
  },
  {
    name: "dbbl",
    label: "DBBL",
    src: "https://i.ibb.co.com/gbmHKWMR/dbbl.jpg",
  },

  // --- Internet Banking & EMI Partners ---
  {
    name: "cellfin",
    label: "CellFin (IBBL)",
    src: "https://play-lh.googleusercontent.com/BMhK3i38uzeMJCkLAy5MpyZD823iHHrnCQssWgu31JxLir9hI3y_kwK9zbJMUG9aHt202P04I3LWVlCHokpwwA",
  },
  {
    name: "citytouch",
    label: "City Touch",
    src: "https://i.ibb.co.com/sd92SqQj/city-touch.jpg",
  },
  {
    name: "brac",
    label: "BRAC Bank",
    src: "https://i.ibb.co.com/DDFdVj0J/brac-bank.jpg",
  },

  // --- Aggregator ---
  {
    name: "sslcommerz",
    label: "SSLCommerz",
    src: "https://i.ibb.co.com/NgqMnf6d/logo.png",
  },
];
const Footer = () => {
  return (
    <footer className="w-full bg-white text-slate-700 font-sans ">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* ================= ROW 1: Logo, Links, Payments ================= */}
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 pb-10 border-b border-slate-100">
          {/* Brand & Certifications */}
          <div className="space-y-4">
            {/* Logo Image Section */}
            <div className="flex items-center">
              <img
                src={logo}
                alt="Hangout Tourist Logo"
                className="h-10 w-auto object-contain max-w-full"
              />
            </div>
            <div className="text-sm text-slate-900 space-y-1 pt-1">
              <p className="mb-4 text-sm opacity-70">
                Your trusted travel partner for flights, hotels, holidays, and
                more. Discover the world with us.
              </p>
            </div>
          </div>

          {/* Primary Contact Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-base mb-1">
              Contact Us
            </h4>
            <p className="text-slate-600">
              <span className="font-medium text-slate-800">Email:</span>{" "}
              <a
                href="mailto:hangouttourist@gmail.com"
                className="text-amber-500 hover:underline"
              >
                hangouttourist@gmail.com
              </a>
            </p>
            <p className="text-slate-600">
              <span className="font-medium text-slate-800">Hotline:</span>{" "}
              <a
                href="tel:+8801795606900"
                className="text-amber-500 hover:underline"
              >
                +8801795-606900
              </a>
            </p>
            <p className="text-slate-600">
              <span className="font-medium text-slate-800">WhatsApp:</span>{" "}
              <a
                href="https://wa.me/8801795606900"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 hover:underline"
              >
                Message us
              </a>
            </p>

            {/* Social Media Row */}
            <div className="flex gap-4 pt-2 text-slate-400">
              <a href="#" className="hover:text-sky-600 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="hover:text-sky-400 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="hover:text-pink-600 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="hover:text-red-600 transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="hover:text-sky-700 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Services Links */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4 text-base">
              Services
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <a
                    href={link.path}
                    className="hover:text-sky-600 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Dhaka Office */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-base mb-1">
              Hang Out Tourist (Dhaka)
            </h4>
            <p className="text-slate-500 leading-relaxed">
              3/96, Ahmed Bawany Textile Mills,
              <br />
              Textile Associates City, Staff Quarter,
              <br />
              Demra, Dhaka-1360, Bangladesh
            </p>
            <a
              href="https://maps.app.goo.gl/YphEKR6VKVtQkEQc7"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-amber-500 font-medium pt-1 hover:text-amber-600"
            >
              <MapPin className="w-4 h-4 fill-amber-500 text-white" /> View Map
            </a>
          </div>
        </div>

        {/* ================= ROW 2: Detailed Contacts & Offices ================= */}
        <div className="grid gap-8 md:grid-cols-3 py-10 border-b border-slate-100 text-sm">
          {/* Payment Gateway Grid Placeholders */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4 text-base">
              We accept
            </h4>
            <div className="grid grid-cols-5 gap-2 max-w-30">
              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  title={method.label}
                  className="h-20 flex items-center justify-center  transition-colors "
                >
                  <img
                    src={method.src}
                    alt={method.label}
                    className="h-full w-full object-contain mix-blend-multiply"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= FOOTER FOOTNOTE ================= */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-8 text-xs text-slate-500 md:flex-row">
          <p>
            Copyright © 2026.{" "}
            <a
              href=""
              className="font-semibold text-amber-500 transition hover:underline"
            >
              Hang Out Tourist
            </a>
            . All rights reserved.
          </p>

          <p className="flex items-center gap-1">
            Designed &amp; Developed by{" "}
            <img
              src="https://i.ibb.co.com/mr3S722Q/Nova.png"
              alt="Novamatrix"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold h-10 text-sky-600 transition hover:text-sky-700 hover:underline"
            />
            
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
