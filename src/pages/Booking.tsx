import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock, Users, CreditCard, ArrowRight, Check, Loader2, Wallet } from "lucide-react";
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
import { usePaystack } from "@/hooks/usePaystack";
import { useWalletPayment } from "@/hooks/useWalletPayment";
import { useWallet } from "@/hooks/useWallet";
import { SeatPicker } from "@/components/booking/SeatPicker";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Validation schema matching edge function requirements
const passengerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Please enter a valid email address").max(255, "Email is too long"),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Phone must be 10-15 digits (optionally starting with +)"),
  nextOfKinName: z.string().min(2, "Next of kin name must be at least 2 characters").max(100, "Name is too long"),
  nextOfKinPhone: z.string().regex(/^\+?[0-9]{10,15}$/, "Next of kin phone must be 10-15 digits"),
});

interface Route {
  id: string;
  origin: string;
  destination: string;
  price: number;
}

const departureTimes = ["7:00 AM", "1:00 PM"];

const steps = [
  { id: 1, name: "Select Route", icon: MapPin },
  { id: 2, name: "Choose Seats", icon: Users },
  { id: 3, name: "Passenger Details", icon: Users },
  { id: 4, name: "Payment", icon: CreditCard },
];

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { initializePayment, isLoading } = usePaystack();
  const { payWithWallet, isLoading: walletLoading } = useWalletPayment();
  const { wallet, user } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'wallet'>('paystack');
  const [formData, setFormData] = useState({
    routeId: searchParams.get("route") || "",
    date: "",
    time: "",
    passengers: "1",
    name: "",
    email: "",
    phone: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
  });

  // Fetch routes from database
  useEffect(() => {
    const fetchRoutes = async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, origin, destination, price");
      if (!error && data) {
        setRoutes(data);
      }
    };
    fetchRoutes();
  }, []);

  // Reset seats when trip details change
  useEffect(() => {
    setSelectedSeats([]);
  }, [formData.routeId, formData.date, formData.time, formData.passengers]);

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
      const requiredSeats = parseInt(formData.passengers);
      if (selectedSeats.length !== requiredSeats) {
        toast({
          title: "Select your seats",
          description: `Please select ${requiredSeats} seat${requiredSeats > 1 ? "s" : ""} to continue.`,
          variant: "destructive",
        });
        return;
      }
    }
    if (currentStep === 3) {
      // Validate passenger details using Zod schema
      const validationResult = passengerSchema.safeParse({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        nextOfKinName: formData.nextOfKinName,
        nextOfKinPhone: formData.nextOfKinPhone,
      });
      
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Invalid input",
          description: firstError?.message || "Please check your input and try again.",
          variant: "destructive",
        });
        return;
      }
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePayment = async () => {
    if (!selectedRoute) return;

    if (paymentMethod === 'wallet') {
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please log in to pay with your wallet.",
          variant: "destructive",
        });
        return;
      }

      const result = await payWithWallet({
        email: formData.email,
        amount: totalPrice,
        name: formData.name,
        phone: formData.phone,
        routeId: formData.routeId,
        date: formData.date,
        time: formData.time,
        passengers: formData.passengers,
        seats: selectedSeats,
        nextOfKinName: formData.nextOfKinName,
        nextOfKinPhone: formData.nextOfKinPhone,
      });

      if (result.success) {
        toast({
          title: "Payment Successful",
          description: `Booking confirmed! Reference: ${result.reference}`,
        });
        navigate(`/confirmation?reference=${result.reference}`);
      } else {
        toast({
          title: "Payment Failed",
          description: result.error || "Could not process wallet payment.",
          variant: "destructive",
        });
      }
    } else {
      const result = await initializePayment({
        email: formData.email,
        amount: totalPrice,
        name: formData.name,
        phone: formData.phone,
        routeId: formData.routeId,
        date: formData.date,
        time: formData.time,
        passengers: formData.passengers,
        seats: selectedSeats,
        nextOfKinName: formData.nextOfKinName,
        nextOfKinPhone: formData.nextOfKinPhone,
      });

      if (result.success && result.authorization_url) {
        sessionStorage.setItem('paystack_reference', result.reference || '');
        window.location.href = result.authorization_url;
      } else {
        toast({
          title: "Payment Failed",
          description: result.error || "Could not initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const walletBalance = wallet?.balance ? wallet.balance / 100 : 0;
  const canPayWithWallet = user && walletBalance >= totalPrice;

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
                    <h2 className="text-xl font-bold text-foreground">Choose Your Seats</h2>
                    <SeatPicker
                      routeId={formData.routeId}
                      date={formData.date}
                      time={formData.time}
                      passengers={parseInt(formData.passengers)}
                      selectedSeats={selectedSeats}
                      onSeatsChange={setSelectedSeats}
                    />
                  </div>
                )}

                {currentStep === 3 && (
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

                    <div className="pt-4 border-t border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Next of Kin Details</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="nextOfKinName">Next of Kin Name</Label>
                          <Input
                            id="nextOfKinName"
                            placeholder="Enter next of kin's full name"
                            value={formData.nextOfKinName}
                            onChange={(e) => handleInputChange("nextOfKinName", e.target.value)}
                            className="h-12 mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="nextOfKinPhone">Next of Kin Phone Number</Label>
                          <Input
                            id="nextOfKinPhone"
                            type="tel"
                            placeholder="Enter next of kin's phone number"
                            value={formData.nextOfKinPhone}
                            onChange={(e) => handleInputChange("nextOfKinPhone", e.target.value)}
                            className="h-12 mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
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
                        <span className="text-muted-foreground">Seats</span>
                        <span className="font-medium">
                          {selectedSeats.sort((a, b) => a - b).map((s) => {
                            const labels = ["1A", "1B", "2A", "2B", "2C"];
                            return labels[s - 1];
                          }).join(", ")}
                        </span>
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
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                  )}
                  <div className="ml-auto">
                    {currentStep < 4 ? (
                      <Button variant="accent" onClick={handleNext}>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="hero" 
                        size="lg" 
                        onClick={handlePayment}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Pay ₦{totalPrice.toLocaleString()}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
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