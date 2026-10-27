import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight, Bus, CalendarDays } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import josRock from "@/assets/jos-rock.jpg";
import abujaCity from "@/assets/abuja-city.jpg";

const routes = [
  {
    id: 1,
    origin: "Jos",
    destination: "Abuja",
    image: josRock,
  },
  {
    id: 2,
    origin: "Abuja",
    destination: "Jos",
    image: abujaCity,
  },
];

const Routes = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRoutes = routes.filter(
    (route) =>
      route.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-primary">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Our Routes & Schedules
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
              We currently serve the Jos–Abuja corridor in both directions. Choose a date to see live departures, parks, seats, and fares.
            </p>
            
            {/* Search */}
            <div className="max-w-md mx-auto">
              <Input
                placeholder="Search routes (e.g. Jos, Abuja)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 h-12"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Routes Grid */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {filteredRoutes.map((route, index) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group"
              >
                {/* Route Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={route.image}
                    alt={`${route.origin} to ${route.destination}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 text-white">
                      <MapPin className="w-5 h-5 text-accent" />
                      <span className="font-bold text-lg">{route.origin}</span>
                      <ArrowRight className="w-4 h-4" />
                      <span className="font-bold text-lg">{route.destination}</span>
                    </div>
                  </div>
                </div>

                {/* Route Details */}
                <div className="p-6">
                  <div className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="w-4 h-4 mt-0.5 text-accent" />
                    <span>Check your travel date for the current fare, pickup park, and available seats.</span>
                  </div>

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Link to={`/booking?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}`}>
                      <Button variant="accent">
                        Check availability
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredRoutes.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Bus className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">No routes found</h3>
              <p className="text-muted-foreground">Try searching for a different city.</p>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Routes;
