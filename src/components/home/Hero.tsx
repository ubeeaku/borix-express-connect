import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Clock, Star, Users, MapPin, TrendingUp, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBus from "@/assets/hero-bus.jpg.asset.json";
import { useMinRoutePrice } from "@/hooks/useMinRoutePrice";

export const Hero = () => {
  const { price, route } = useMinRoutePrice();
  return (
    <section className="relative min-h-screen flex items-center bg-primary overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/50 rounded-full blur-3xl" />
      </div>

      {/* Mobile hero background photo */}
      <div className="absolute inset-0 lg:hidden">
        <img
          src={heroBus.url}
          alt="Borix Express coach"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/70 to-primary" />
      </div>

      <div className="container-custom relative z-10 pt-24 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6"
            >
              <Star className="w-4 h-4 text-accent" />
              <span className="text-white/90 text-sm font-medium">
                Nigeria's #1 Intercity Transport
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4"
            >
              Reliable Intercity{" "}
              <span className="text-accent">Transport</span> Across Nigeria
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-base md:text-lg text-white/80 mb-6 max-w-xl mx-auto lg:mx-0"
            >
              Reserve a seat with a specific driver and park in minutes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="inline-flex items-center gap-2 bg-accent/15 border border-accent/30 rounded-full px-4 py-1.5 mb-6"
            >
              <Tag className="w-4 h-4 text-accent" />
              <span className="text-white text-sm font-medium">
                From <span className="text-accent font-bold">₦{price.toLocaleString()}</span>
                {route ? ` · ${route.origin} ↔ ${route.destination}` : ""}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to="/booking">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Book a Ride
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/routes">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  View Routes
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-2 mt-12 pt-8 border-t border-white/10 divide-x divide-white/10"
            >
              {[
                { icon: Users, value: "50K+", label: "Happy Customers" },
                { icon: MapPin, value: "20+", label: "Routes" },
                { icon: TrendingUp, value: "99%", label: "On-time Rate" },
              ].map((stat, index) => (
                <div key={index} className="px-2 text-center lg:text-left first:pl-0">
                  <stat.icon className="w-5 h-5 text-accent mb-1 mx-auto lg:mx-0" />
                  <p className="text-2xl md:text-3xl font-bold text-accent leading-none">{stat.value}</p>
                  <p className="text-xs md:text-sm text-white/60 mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Image/Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="hidden lg:block relative"
          >
            <div className="relative">
              {/* Main Image Container */}
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={heroBus.url}
                  alt="Borix Express intercity coach on the highway at sunset"
                  width={1600}
                  height={1200}
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-8 top-20 z-20 bg-white rounded-2xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">100% Safe</p>
                    <p className="text-sm text-muted-foreground">Verified drivers</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -right-8 bottom-32 z-20 bg-white rounded-2xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">On Time</p>
                    <p className="text-sm text-muted-foreground">Always punctual</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
