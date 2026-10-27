import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, ChevronDown } from "lucide-react";
import borixLogo from "@/assets/borix-logo-white.png";

type Section = "links" | "routes" | null;

export const Footer = () => {
  const [openMobile, setOpenMobile] = useState<Section>(null);

  const toggle = (s: Section) => setOpenMobile((cur) => (cur === s ? null : s));

  return (
    <footer className="bg-primary text-white">
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center">
              <img src={borixLogo} alt="Borix Express" className="h-14 w-auto" />
            </Link>
            <p className="text-white/70 text-sm leading-relaxed">
              Intercity travel between Jos and Abuja, in both directions.
            </p>
          </div>

          {/* Quick Links */}
          <div className="border-b border-white/10 md:border-0 pb-2 md:pb-0">
            <button
              type="button"
              onClick={() => toggle("links")}
              className="md:hidden w-full flex items-center justify-between py-3"
              aria-expanded={openMobile === "links"}
            >
              <span className="font-bold text-lg">Quick Links</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${openMobile === "links" ? "rotate-180" : ""}`} />
            </button>
            <h4 className="hidden md:block font-bold text-lg mb-4">Quick Links</h4>
            <ul className={`space-y-3 md:block ${openMobile === "links" ? "block pb-4" : "hidden"}`}>
              {[
                { name: "Home", path: "/" },
                { name: "About Us", path: "/about" },
                { name: "Our Routes", path: "/routes" },
                { name: "Book a Ride", path: "/booking" },
                { name: "Contact Us", path: "/contact" },
                { name: "Help & FAQs", path: "/help" },
              ].map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-white/70 hover:text-accent transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Routes */}
          <div className="border-b border-white/10 md:border-0 pb-2 md:pb-0">
            <button
              type="button"
              onClick={() => toggle("routes")}
              className="md:hidden w-full flex items-center justify-between py-3"
              aria-expanded={openMobile === "routes"}
            >
              <span className="font-bold text-lg">Popular Routes</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${openMobile === "routes" ? "rotate-180" : ""}`} />
            </button>
            <h4 className="hidden md:block font-bold text-lg mb-4">Popular Routes</h4>
            <ul className={`space-y-3 md:block ${openMobile === "routes" ? "block pb-4" : "hidden"}`}>
              {["Jos → Abuja", "Abuja → Jos"].map((route) => (
                <li key={route}>
                  <span className="text-white/70 text-sm">{route}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-bold text-lg mb-4 pt-3 md:pt-0">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm text-white/70">Call us</p>
                  <a href="tel:+2349036573414" className="font-medium hover:text-accent transition-colors">
                    +234 903 657 3414
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm text-white/70">Email us</p>
                  <a href="mailto:borixexpressltd@gmail.com" className="font-medium hover:text-accent transition-colors">
                    borixexpressltd@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm text-white/70">Head Office</p>
                  <p className="font-medium">Jos, Nigeria</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/60">© {new Date().getFullYear()} Borix Express. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-white/60">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms and Conditions</Link>
            <Link to="/admin" className="hover:text-white transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
