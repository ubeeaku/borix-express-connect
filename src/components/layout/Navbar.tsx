import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, Wallet, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import borixLogo from "@/assets/borix-logo-new.png";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Routes", path: "/routes" },
  { name: "Book Now", path: "/booking" },
  { name: "Drive With Us", path: "/driver/drive-with-us" },
  { name: "Contact", path: "/contact" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b border-border">
      <div className="container-custom">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={borixLogo} alt="Borix Express" className="h-16 md:h-20 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-semibold uppercase tracking-wide transition-colors duration-200 ${
                  location.pathname === link.path
                    ? "text-accent"
                    : "text-primary hover:text-accent"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a href="tel:+2349036573414" className="flex items-center gap-2 text-primary/80 hover:text-accent transition-colors">
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium">+234 903 657 3414</span>
            </a>
            {user ? (
              <>
                <Link to="/wallet">
                  <Button variant="outline" size="sm" className="font-semibold gap-2">
                    <Wallet className="w-4 h-4" /> My Wallet
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={signOut} className="font-semibold gap-2 text-muted-foreground">
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="accent" size="sm" className="font-semibold gap-2">
                  <LogIn className="w-4 h-4" /> Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-primary"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-border"
          >
            <div className="container-custom py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block py-2 text-base font-semibold uppercase tracking-wide ${
                    location.pathname === link.path
                      ? "text-accent"
                      : "text-primary/80"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-3">
                {user ? (
                  <>
                    <Link to="/wallet" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full font-semibold gap-2">
                        <Wallet className="w-4 h-4" /> My Wallet
                      </Button>
                    </Link>
                    <Button variant="ghost" className="w-full font-semibold gap-2 text-muted-foreground" onClick={() => { signOut(); setIsOpen(false); }}>
                      <LogOut className="w-4 h-4" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="accent" className="w-full font-semibold gap-2">
                      <LogIn className="w-4 h-4" /> Sign In
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
