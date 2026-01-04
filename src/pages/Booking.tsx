import { useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock, Users, CreditCard, ArrowRight, Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const routes = [
  { id: "1", origin: "Lagos", destination: "Abuja", price: 15000 },
  { id: "2", origin: "Jos", destination: "Abuja", price: 8000 },
  { id: "3", origin: "Lagos", destination: "Port Harcourt", price: 12000 },
  { id: "4", origin: "Kano", destination: "Lagos", price: 18000 },
  { id: "5", origin: "Enugu", destination: "Lagos", price: 10000 },
  { id: "6", origin: "Abuja", destination: "Kaduna", price: 5000 },
];

const departureTimes = ["6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM"];

const steps = [
  { id: 1, name: "Select Route", icon: MapPin },
  { id: 2, name: "Passenger Details", icon: Users },
  { id: 3, name: "Payment", icon: CreditCard },
];

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    routeId: searchParams.get("route") || "",
    date: "",
    time: "",
    passengers: "1",
    name: "",
    email: "",
    phone: "",
  });

  const selectedRoute = routes.find((r) => r.id === formData.routeId);
  const totalPrice = selectedRoute ? selectedRoute.price * parseInt(formData.passengers || "1") : 0;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.routeId || !formData.date || !formData.time) {
        toast({
          title: "Please fill all fields",
          description: "Select a route, date, and departure time to continue.",
          variant: "destructive",
        });
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.name || !formData.email || !formData.phone) {
        toast({
          title: "Please fill all fields",
          description: "Enter your name, email, and phone number to continue.",
          variant: "destructive",
        });
        return;
      }
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePayment = () => {
    toast({
      title: "Booking Confirmed! 🎉",
      description: "Your booking has been confirmed. Check your email for the ticket.",
    });
    setTimeout(() => {
      navigate("/confirmation");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />

      <section className="pt-24 pb-12 bg-primary">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Book Your Journey
            </h1>
            <p className="text-white/80 max-w-xl mx-auto">
              Complete your booking in 3 easy steps
            </p>
          </motion.div>

          {/* Steps */}
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-4 md:gap-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      currentStep >= step.id
                        ? "bg-accent text-accent-foreground"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                    <span className="hidden md:inline font-medium">{step.name}</span>
                    <span className="md:hidden font-medium">{step.id}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-8 md:w-16 h-0.5 mx-2 ${
                        currentStep > step.id ? "bg-accent" : "bg-white/20"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-2">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-2xl p-6 md:p-8 shadow-md"
              >
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-foreground">Select Your Route</h2>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="route">Route</Label>
                        <Select
                          value={formData.routeId}
                          onValueChange={(value) => handleInputChange("routeId", value)}
                        >
                          <SelectTrigger className="h-12 mt-1">
                            <SelectValue placeholder="Select a route" />
                          </SelectTrigger>
                          <SelectContent>
                            {routes.map((route) => (
                              <SelectItem key={route.id} value={route.id}>
                                {route.origin} → {route.destination} (₦{route.price.toLocaleString()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="date">Travel Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleInputChange("date", e.target.value)}
                            className="h-12 mt-1"
                            min={new Date().toISOString().split("T")[0]}
                          />
                        </div>
                        <div>
                          <Label htmlFor="time">Departure Time</Label>
                          <Select
                            value={formData.time}
                            onValueChange={(value) => handleInputChange("time", value)}
                          >
                            <SelectTrigger className="h-12 mt-1">
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {departureTimes.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="passengers">Number of Passengers</Label>
                        <Select
                          value={formData.passengers}
                          onValueChange={(value) => handleInputChange("passengers", value)}
                        >
                          <SelectTrigger className="h-12 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} {num === 1 ? "Passenger" : "Passengers"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-foreground">Passenger Details</h2>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className="h-12 mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="h-12 mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Enter your phone number"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          className="h-12 mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-foreground">Payment</h2>

                    <div className="bg-muted rounded-xl p-6 space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Route</span>
                        <span className="font-medium">
                          {selectedRoute?.origin} → {selectedRoute?.destination}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">{formData.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{formData.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Passengers</span>
                        <span className="font-medium">{formData.passengers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Passenger Name</span>
                        <span className="font-medium">{formData.name}</span>
                      </div>
                      <div className="pt-4 border-t border-border flex justify-between">
                        <span className="font-bold text-foreground">Total</span>
                        <span className="font-bold text-xl text-accent">
                          ₦{totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="bg-accent/10 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Pay with Paystack</p>
                        <p className="text-sm text-muted-foreground">
                          Secure payment via card, bank transfer, or USSD
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  {currentStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                    >
                      Back
                    </Button>
                  )}
                  <div className="ml-auto">
                    {currentStep < 3 ? (
                      <Button variant="accent" onClick={handleNext}>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button variant="hero" size="lg" onClick={handlePayment}>
                        Pay ₦{totalPrice.toLocaleString()}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 shadow-md sticky top-28">
                <h3 className="font-bold text-foreground mb-4">Booking Summary</h3>
                
                {selectedRoute ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-foreground">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span>{selectedRoute.origin} → {selectedRoute.destination}</span>
                    </div>
                    {formData.date && (
                      <div className="flex items-center gap-2 text-foreground">
                        <Calendar className="w-4 h-4 text-accent" />
                        <span>{formData.date}</span>
                      </div>
                    )}
                    {formData.time && (
                      <div className="flex items-center gap-2 text-foreground">
                        <Clock className="w-4 h-4 text-accent" />
                        <span>{formData.time}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-foreground">
                      <Users className="w-4 h-4 text-accent" />
                      <span>{formData.passengers} passenger(s)</span>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Price per seat</span>
                        <span>₦{selectedRoute.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-accent">₦{totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Select a route to see your booking summary
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Booking;