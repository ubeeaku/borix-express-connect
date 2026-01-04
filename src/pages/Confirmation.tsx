import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle, Download, MapPin, Calendar, Clock, User, Bus, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const Confirmation = () => {
  const bookingDetails = {
    ticketId: "BRX-2024-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    route: "Lagos → Abuja",
    date: new Date().toLocaleDateString("en-NG", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    }),
    time: "8:00 AM",
    passenger: "Guest User",
    seats: ["A1"],
    pickup: "Jibowu Bus Terminal, Lagos",
    price: 15000,
  };

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />

      <section className="pt-32 pb-20">
        <div className="container-custom max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl shadow-xl overflow-hidden"
          >
            {/* Success Header */}
            <div className="bg-primary p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Booking Confirmed!
              </h1>
              <p className="text-white/80">
                Your ticket has been sent to your email and WhatsApp
              </p>
            </div>

            {/* Ticket Details */}
            <div className="p-8">
              {/* Ticket ID */}
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground mb-1">Ticket ID</p>
                <p className="text-2xl font-mono font-bold text-foreground tracking-wider">
                  {bookingDetails.ticketId}
                </p>
              </div>

              {/* Journey Details */}
              <div className="bg-muted rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">Lagos</p>
                    <p className="text-sm text-muted-foreground">Origin</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-accent" />
                    <Bus className="w-6 h-6 text-accent" />
                    <div className="w-8 h-0.5 bg-accent" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">Abuja</p>
                    <p className="text-sm text-muted-foreground">Destination</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-foreground">{bookingDetails.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm text-muted-foreground">Departure</p>
                      <p className="font-medium text-foreground">{bookingDetails.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm text-muted-foreground">Passenger</p>
                      <p className="font-medium text-foreground">{bookingDetails.passenger}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Bus className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm text-muted-foreground">Seat(s)</p>
                      <p className="font-medium text-foreground">{bookingDetails.seats.join(", ")}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pickup Location */}
              <div className="flex items-start gap-3 p-4 bg-accent/10 rounded-xl mb-6">
                <MapPin className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Pickup Location</p>
                  <p className="text-muted-foreground">{bookingDetails.pickup}</p>
                </div>
              </div>

              {/* Amount Paid */}
              <div className="flex justify-between items-center p-4 bg-primary rounded-xl mb-8">
                <span className="text-white font-medium">Amount Paid</span>
                <span className="text-2xl font-bold text-accent">
                  ₦{bookingDetails.price.toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="accent" className="flex-1">
                  <Download className="w-4 h-4" />
                  Download Ticket
                </Button>
                <Link to="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Home
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Important Notes */}
            <div className="px-8 pb-8">
              <div className="border-t border-border pt-6">
                <h3 className="font-semibold text-foreground mb-3">Important Notes</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Please arrive at the terminal at least 30 minutes before departure</li>
                  <li>• Bring a valid ID along with this ticket</li>
                  <li>• For cancellations, contact us at least 24 hours before departure</li>
                  <li>• Maximum luggage allowance: 2 bags (50kg total)</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Confirmation;