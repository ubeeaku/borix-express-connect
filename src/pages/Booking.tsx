import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, CreditCard, ArrowRight, Check, Loader2, Wallet, Clock, Car } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { usePaystack } from "@/hooks/usePaystack";
import { useWalletPayment } from "@/hooks/useWalletPayment";
import { useWallet } from "@/hooks/useWallet";
import { VehicleSeatPicker } from "@/components/booking/VehicleSeatPicker";
import { DeparturesList } from "@/components/booking/DeparturesList";
import type { DepartureInfo } from "@/components/booking/DepartureCard";
import { z } from "zod";

const passengerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address").max(255),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Phone must be 10-15 digits"),
  nextOfKinName: z.string().min(2, "Next of kin name required").max(100),
  nextOfKinPhone: z.string().regex(/^\+?[0-9]{10,15}$/, "Next of kin phone must be 10-15 digits"),
});

const CITIES = ["Jos", "Abuja"];

const steps = [
  { id: 1, name: "Route", icon: MapPin },
  { id: 2, name: "Departure", icon: Clock },
  { id: 3, name: "Seats", icon: Users },
  { id: 4, name: "Details", icon: Users },
  { id: 5, name: "Payment", icon: CreditCard },
];

const todayStr = () => new Date().toISOString().split("T")[0];
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; };

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { initializePayment, isLoading } = usePaystack();
  const { payWithWallet, isLoading: walletLoading } = useWalletPayment();
  const { wallet, user } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'wallet'>('paystack');
  const [selectedDeparture, setSelectedDeparture] = useState<DepartureInfo | null>(null);

  const [formData, setFormData] = useState({
    origin: searchParams.get("origin") || "Jos",
    destination: searchParams.get("destination") || "Abuja",
    date: searchParams.get("date") || todayStr(),
    passengers: "1",
    name: "",
    email: "",
    phone: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
  });

  useEffect(() => { setSelectedSeats([]); }, [selectedDeparture?.id, formData.passengers]);

  const totalPrice = selectedDeparture ? selectedDeparture.price * parseInt(formData.passengers || "1") : 0;
  const capacity = selectedDeparture?.vehicle?.capacity ?? 7;
  const seatsLeft = selectedDeparture ? capacity - selectedDeparture.seatsBooked : 0;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectDeparture = (dep: DepartureInfo) => {
    setSelectedDeparture(dep);
    setCurrentStep(3);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.origin || !formData.destination || !formData.date) {
        toast({ title: "Please fill all fields", description: "Choose origin, destination, and date.", variant: "destructive" });
        return;
      }
      if (formData.origin === formData.destination) {
        toast({ title: "Invalid route", description: "Origin and destination must differ.", variant: "destructive" });
        return;
      }
    }
    if (currentStep === 3) {
      const required = parseInt(formData.passengers);
      if (selectedSeats.length !== required) {
        toast({ title: "Select your seats", description: `Please select ${required} seat${required > 1 ? "s" : ""}.`, variant: "destructive" });
        return;
      }
    }
    if (currentStep === 4) {
      const result = passengerSchema.safeParse(formData);
      if (!result.success) {
        toast({ title: "Invalid input", description: result.error.errors[0]?.message, variant: "destructive" });
        return;
      }
    }
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 3) setSelectedDeparture(null);
    setCurrentStep(currentStep - 1);
  };

  const handlePayment = async () => {
    if (!selectedDeparture) return;
    const baseParams = {
      email: formData.email,
      amount: totalPrice,
      name: formData.name,
      phone: formData.phone,
      departureId: selectedDeparture.id,
      passengers: formData.passengers,
      seats: selectedSeats,
      nextOfKinName: formData.nextOfKinName,
      nextOfKinPhone: formData.nextOfKinPhone,
    };

    if (paymentMethod === 'wallet') {
      if (!user) {
        toast({ title: "Login Required", description: "Please log in to pay with your wallet.", variant: "destructive" });
        return;
      }
      const result = await payWithWallet(baseParams);
      if (result.success) {
        toast({ title: "Payment Successful", description: `Booking confirmed! Reference: ${result.reference}` });
        navigate(`/confirmation?reference=${result.reference}`);
      } else {
        toast({ title: "Payment Failed", description: result.error || "Wallet payment failed.", variant: "destructive" });
      }
    } else {
      const result = await initializePayment(baseParams);
      if (result.success && result.authorization_url) {
        sessionStorage.setItem('paystack_reference', result.reference || '');
        window.location.href = result.authorization_url;
      } else {
        toast({ title: "Payment Failed", description: result.error || "Could not initialize payment.", variant: "destructive" });
      }
    }
  };

  const walletBalance = wallet?.balance ? wallet.balance / 100 : 0;
  const canPayWithWallet = !!user && walletBalance >= totalPrice;

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />

      <section className="pt-24 pb-8 bg-primary">
        <div className="container-custom">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Reserve Your Seat</h1>
            <p className="text-white/80 max-w-xl mx-auto">Pick a departure, choose your seat, and travel with a verified driver.</p>
          </motion.div>

          <div className="flex justify-center mt-6 overflow-x-auto">
            <div className="flex items-center gap-2 md:gap-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                    currentStep >= step.id ? "bg-accent text-accent-foreground" : "bg-white/10 text-white/60"
                  }`}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                    <span className="hidden md:inline font-medium">{step.name}</span>
                    <span className="md:hidden font-medium">{step.id}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-4 md:w-8 h-0.5 mx-1 ${currentStep > step.id ? "bg-accent" : "bg-white/20"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom max-w-5xl">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-2xl p-6 md:p-8 shadow-md">

                {/* STEP 1 — Route + Date */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-foreground">Where are you going?</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="origin">From</Label>
                        <Select value={formData.origin} onValueChange={v => handleInputChange("origin", v)}>
                          <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="Departure city" /></SelectTrigger>
                          <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="destination">To</Label>
                        <Select value={formData.destination} onValueChange={v => handleInputChange("destination", v)}>
                          <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="Destination city" /></SelectTrigger>
                          <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Travel date</Label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <Button type="button" variant={formData.date === todayStr() ? "accent" : "outline"} onClick={() => handleInputChange("date", todayStr())}>Today</Button>
                        <Button type="button" variant={formData.date === tomorrowStr() ? "accent" : "outline"} onClick={() => handleInputChange("date", tomorrowStr())}>Tomorrow</Button>
                        <Input type="date" value={formData.date} onChange={e => handleInputChange("date", e.target.value)}
                          className="h-10" min={todayStr()} />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="passengers">Number of passengers</Label>
                      <Select value={formData.passengers} onValueChange={v => handleInputChange("passengers", v)}>
                        <SelectTrigger className="h-12 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{[1, 2, 3, 4, 5].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? "Passenger" : "Passengers"}</SelectItem>
                        ))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* STEP 2 — Departures list */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Available departures</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formData.origin} → {formData.destination} • {formData.date}
                      </p>
                    </div>
                    <DeparturesList
                      origin={formData.origin}
                      destination={formData.destination}
                      date={formData.date}
                      onSelect={handleSelectDeparture}
                    />
                  </div>
                )}

                {/* STEP 3 — Seats */}
                {currentStep === 3 && selectedDeparture && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground">Choose your seats</h2>
                    <VehicleSeatPicker
                      departureId={selectedDeparture.id}
                      vehicleType={selectedDeparture.vehicle?.vehicle_type ?? 'sienna'}
                      capacity={capacity}
                      passengers={parseInt(formData.passengers)}
                      selectedSeats={selectedSeats}
                      onSeatsChange={setSelectedSeats}
                    />
                  </div>
                )}

                {/* STEP 4 — Passenger details */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-foreground">Passenger details</h2>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full name</Label>
                        <Input id="name" placeholder="John Doe" value={formData.name} onChange={e => handleInputChange("name", e.target.value)} className="h-12 mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="email">Email address</Label>
                        <Input id="email" type="email" placeholder="you@example.com" value={formData.email} onChange={e => handleInputChange("email", e.target.value)} className="h-12 mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone number</Label>
                        <Input id="phone" type="tel" placeholder="+234..." value={formData.phone} onChange={e => handleInputChange("phone", e.target.value)} className="h-12 mt-1" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Next of kin</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="nextOfKinName">Next of kin name</Label>
                          <Input id="nextOfKinName" placeholder="Full name" value={formData.nextOfKinName} onChange={e => handleInputChange("nextOfKinName", e.target.value)} className="h-12 mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="nextOfKinPhone">Next of kin phone</Label>
                          <Input id="nextOfKinPhone" type="tel" placeholder="+234..." value={formData.nextOfKinPhone} onChange={e => handleInputChange("nextOfKinPhone", e.target.value)} className="h-12 mt-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5 — Payment */}
                {currentStep === 5 && selectedDeparture && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-foreground">Payment</h2>

                    <div className="bg-muted rounded-xl p-6 space-y-3 text-sm">
                      <Row k="Route" v={`${formData.origin} → ${formData.destination}`} />
                      <Row k="Date" v={formData.date} />
                      <Row k="Departure" v={selectedDeparture.departure_time} />
                      <Row k="Park" v={selectedDeparture.park?.name ?? '—'} />
                      <Row k="Driver" v={selectedDeparture.driver?.full_name ?? '—'} />
                      <Row k="Vehicle" v={`${selectedDeparture.vehicle?.vehicle_type ?? '—'} • ${selectedDeparture.vehicle?.plate_number ?? ''}`} />
                      <Row k="Seats" v={selectedSeats.sort((a, b) => a - b).join(', ')} />
                      <Row k="Passenger" v={formData.name} />
                      <div className="pt-3 border-t border-border flex justify-between">
                        <span className="font-bold text-foreground">Total</span>
                        <span className="font-bold text-xl text-accent">₦{totalPrice.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-foreground">Choose payment method</p>

                      <PayOpt active={paymentMethod === 'paystack'} onClick={() => setPaymentMethod('paystack')}
                        icon={<CreditCard className="w-6 h-6" />} title="Pay with Paystack"
                        sub="Card, bank transfer, or USSD" />

                      <PayOpt active={paymentMethod === 'wallet'} onClick={() => user && setPaymentMethod('wallet')}
                        disabled={!user} icon={<Wallet className="w-6 h-6" />} title="Pay with Wallet"
                        sub={user
                          ? `Balance: ₦${walletBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}${!canPayWithWallet && walletBalance > 0 ? ' (Insufficient)' : ''}`
                          : "Sign in to use wallet"} />

                      <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                        Flutterwave & bank transfer coming soon.
                      </div>
                    </div>

                    {paymentMethod === 'wallet' && !canPayWithWallet && user && (
                      <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
                        Wallet balance is less than the total. Top up or use Paystack.
                      </div>
                    )}
                  </div>
                )}

                {/* Nav buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  {currentStep > 1 && (
                    <Button variant="outline" onClick={handleBack} disabled={isLoading || walletLoading}>Back</Button>
                  )}
                  <div className="ml-auto">
                    {currentStep < 5 ? (
                      // Step 2 has no Continue (cards drive navigation)
                      currentStep !== 2 && (
                        <Button variant="accent" onClick={handleNext}>
                          Continue <ArrowRight className="w-4 h-4" />
                        </Button>
                      )
                    ) : (
                      <Button variant="hero" size="lg" onClick={handlePayment}
                        disabled={isLoading || walletLoading || (paymentMethod === 'wallet' && !canPayWithWallet)}>
                        {(isLoading || walletLoading) ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
                        ) : (
                          <>{paymentMethod === 'wallet' ? <Wallet className="w-4 h-4" /> : null}
                          Pay ₦{totalPrice.toLocaleString()}<ArrowRight className="w-4 h-4" /></>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 shadow-md sticky top-28">
                <h3 className="font-bold text-foreground mb-4">Booking summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4 text-accent" />
                    {formData.origin} → {formData.destination}
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4 text-accent" />{formData.date}
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Users className="w-4 h-4 text-accent" />{formData.passengers} passenger(s)
                  </div>
                  {selectedDeparture && (
                    <>
                      <div className="flex items-center gap-2 text-foreground">
                        <Clock className="w-4 h-4 text-accent" />{selectedDeparture.departure_time}
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Car className="w-4 h-4 text-accent" />
                        <span className="capitalize">{selectedDeparture.vehicle?.vehicle_type}</span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Driver: {selectedDeparture.driver?.full_name}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Park: {selectedDeparture.park?.name}
                      </div>
                    </>
                  )}
                  <div className="pt-3 border-t border-border">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Per seat</span>
                      <span>₦{(selectedDeparture?.price ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-accent">₦{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium text-right break-words">{v}</span>
  </div>
);

const PayOpt = ({ active, onClick, disabled, icon, title, sub }: {
  active: boolean; onClick: () => void; disabled?: boolean; icon: React.ReactNode; title: string; sub: string;
}) => (
  <button type="button" onClick={onClick} disabled={disabled}
    className={`w-full rounded-xl p-4 flex items-center gap-4 border-2 transition-colors ${
      active ? 'border-accent bg-accent/10'
      : disabled ? 'border-border opacity-50 cursor-not-allowed' : 'border-border hover:border-accent/50'
    }`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
      {icon}
    </div>
    <div className="text-left flex-1">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{sub}</p>
    </div>
    {active && <Check className="w-5 h-5 text-accent" />}
  </button>
);

export default Booking;
