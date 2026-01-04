import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Clock, Users, ArrowRight, Bus } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const routes = [
  {
    id: 1,
    origin: "Lagos",
    destination: "Abuja",
    price: 15000,
    duration: "8 hours",
    departures: ["6:00 AM", "8:00 AM", "10:00 AM", "2:00 PM", "6:00 PM"],
    availableSeats: 24,
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=80",
  },
  {
    id: 2,
    origin: "Jos",
    destination: "Abuja",
    price: 8000,
    duration: "3 hours",
    departures: ["7:00 AM", "10:00 AM", "1:00 PM", "4:00 PM"],
    availableSeats: 18,
    image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&q=80",
  },
  {
    id: 3,
    origin: "Lagos",
    destination: "Port Harcourt",
    price: 12000,
    duration: "6 hours",
    departures: ["6:30 AM", "9:00 AM", "12:00 PM", "5:00 PM"],
    availableSeats: 20,
    image: "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?w=400&q=80",
  },
  {
    id: 4,
    origin: "Kano",
    destination: "Lagos",
    price: 18000,
    duration: "10 hours",
    departures: ["5:00 AM", "8:00 AM", "2:00 PM"],
    availableSeats: 15,
    image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80",
  },
  {
    id: 5,
    origin: "Enugu",
    destination: "Lagos",
    price: 10000,
    duration: "5 hours",
    departures: ["6:00 AM", "10:00 AM", "3:00 PM"],
    availableSeats: 22,
    image: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=400&q=80",
  },
  {
    id: 6,
    origin: "Abuja",
    destination: "Kaduna",
    price: 5000,
    duration: "2 hours",
    departures: ["7:00 AM", "9:00 AM", "11:00 AM", "2:00 PM", "5:00 PM"],
    availableSeats: 28,
    image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=80",
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
              Find the best route for your journey. We cover major cities across Nigeria.
            </p>
            
            {/* Search */}
            <div className="max-w-md mx-auto">
              <Input
                placeholder="Search routes (e.g. Lagos, Abuja)"
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{route.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{route.availableSeats} seats</span>
                    </div>
                  </div>

                  {/* Departure Times */}
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Departure times:</p>
                    <div className="flex flex-wrap gap-2">
                      {route.departures.slice(0, 3).map((time, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-foreground"
                        >
                          {time}
                        </span>
                      ))}
                      {route.departures.length > 3 && (
                        <span className="px-3 py-1 bg-accent/10 rounded-full text-xs font-medium text-accent">
                          +{route.departures.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">From</p>
                      <p className="text-2xl font-bold text-foreground">
                        ₦{route.price.toLocaleString()}
                      </p>
                    </div>
                    <Link to={`/booking?route=${route.id}`}>
                      <Button variant="accent">
                        Book Now
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