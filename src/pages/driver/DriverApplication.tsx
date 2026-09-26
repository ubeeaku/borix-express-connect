import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle,
  Loader2,
  User,
  Car,
  FileText,
  CreditCard,
} from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  { id: 1, label: "Personal Info", icon: User },
  { id: 2, label: "Vehicle", icon: Car },
  { id: 3, label: "Documents", icon: FileText },
  { id: 4, label: "Bank & Guarantor", icon: CreditCard },
];

const nigerianStates = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

type ApplicationFiles = {
  drivers_license: File | null;
  nin: File | null;
  passport_photo: File | null;
  vehicle_papers: File | null;
  roadworthiness: File | null;
};

const DriverApplication = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [parks, setParks] = useState<
    { id: string; name: string; city: string }[]
  >([]);

  const [loadingParks, setLoadingParks] = useState(true);

  const [files, setFiles] = useState<ApplicationFiles>({
    drivers_license: null,
    nin: null,
    passport_photo: null,
    vehicle_papers: null,
    roadworthiness: null,
  });

  const [form, setForm] = useState({
    full_name: "",
    park_id: "",
    phone: "",
    email: "",
    address: "",
    state: "",
    city: "",

    years_experience: "",

    vehicle_type: "",
    vehicle_model: "",
    vehicle_year: "",
    vehicle_plate_number: "",
    vehicle_color: "",
    vehicle_capacity: "",

    guarantor_name: "",
    guarantor_phone: "",
    guarantor_address: "",
    guarantor_relationship: "",

    bank_account_name: "",
    bank_name: "",
    bank_account_number: "",
  });

  useEffect(() => {
    const fetchParks = async () => {
      setLoadingParks(true);

      const { data, error } = await supabase
        .from("parks")
        .select("id, name, city")
        .eq("status", "active")
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to load parks:", error);

        toast({
          title: "Unable to load parks",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
      } else {
        setParks(data || []);
      }

      setLoadingParks(false);
    };

    fetchParks();
  }, []);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (
    field: keyof ApplicationFiles,
    file: File | null
  ) => {
    setFiles((prev) => ({
      ...prev,
      [field]: file,
    }));
  };

  const uploadFile = async (file: File, folder: string) => {
    const rawExt = (file.name.split(".").pop() || "").toLowerCase();
    const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : "bin";

    // Unique, unguessable path inside the private driver-documents bucket
    const path = `applications/${crypto.randomUUID()}/${folder}.${ext}`;

    const { error } = await supabase.storage
      .from("driver-documents")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

    if (error) throw error;

    // Store the private storage path, not a public URL.
    return path;
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (
          !form.full_name.trim() ||
          !form.phone.trim() ||
          !form.email.trim() ||
          !form.address.trim() ||
          !form.state ||
          !form.city.trim() ||
          !form.park_id
        ) {
          toast({
            title: "Please fill all required fields",
            description:
              "Please complete all required personal information, including email, and select your operating park.",
            variant: "destructive",
          });

          return false;
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
        ) {
          toast({
            title: "Invalid email address",
            description: "Please enter a valid email address.",
            variant: "destructive",
          });

          return false;
        }

        return true;

      case 2:
        if (!form.years_experience.trim()) {
          toast({
            title: "Missing driving experience",
            description:
              "Please provide your years of driving experience.",
            variant: "destructive",
          });

          return false;
        }

        if (
          !form.vehicle_type ||
          !form.vehicle_model.trim() ||
          !form.vehicle_year.trim() ||
          !form.vehicle_plate_number.trim() ||
          !form.vehicle_color.trim() ||
          !form.vehicle_capacity.trim()
        ) {
          toast({
            title: "Incomplete vehicle information",
            description:
              "Please provide the vehicle type, model, year, plate number, color and passenger capacity.",
            variant: "destructive",
          });

          return false;
        }

        const vehicleYear = Number(form.vehicle_year);
        const vehicleCapacity = Number(form.vehicle_capacity);
        const currentYear = new Date().getFullYear();

        if (
          !Number.isInteger(vehicleYear) ||
          vehicleYear < 1900 ||
          vehicleYear > currentYear + 1
        ) {
          toast({
            title: "Invalid vehicle year",
            description:
              "Please enter a valid vehicle year.",
            variant: "destructive",
          });

          return false;
        }

        if (
          !Number.isInteger(vehicleCapacity) ||
          vehicleCapacity < 1 ||
          vehicleCapacity > 20
        ) {
          toast({
            title: "Invalid vehicle capacity",
            description:
              "Vehicle capacity must be between 1 and 20 passenger seats.",
            variant: "destructive",
          });

          return false;
        }

        return true;

      case 3:
        if (
          !files.drivers_license ||
          !files.nin ||
          !files.passport_photo
        ) {
          toast({
            title: "Please upload all required documents",
            description:
              "Driver's License, NIN and Passport Photograph are required.",
            variant: "destructive",
          });

          return false;
        }

        return true;

      case 4:
        if (
          !form.guarantor_name.trim() ||
          !form.guarantor_phone.trim() ||
          !form.bank_account_name.trim() ||
          !form.bank_name.trim() ||
          !form.bank_account_number.trim()
        ) {
          toast({
            title: "Please fill all required fields",
            description:
              "Please complete the required guarantor and bank information.",
            variant: "destructive",
          });

          return false;
        }

        if (!/^\d{10}$/.test(form.bank_account_number.trim())) {
          toast({
            title: "Invalid account number",
            description:
              "Please enter a valid 10-digit bank account number.",
            variant: "destructive",
          });

          return false;
        }

        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;

    setStep((s) => Math.min(s + 1, 4));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setSubmitting(true);

    try {
      // Upload files
      const urls: Record<string, string | null> = {
        drivers_license_url: null,
        nin_url: null,
        passport_photo_url: null,
        vehicle_papers_url: null,
        roadworthiness_url: null,
      };

      if (files.drivers_license) {
        urls.drivers_license_url = await uploadFile(
          files.drivers_license,
          "licenses"
        );
      }

      if (files.nin) {
        urls.nin_url = await uploadFile(
          files.nin,
          "nin"
        );
      }

      if (files.passport_photo) {
        urls.passport_photo_url = await uploadFile(
          files.passport_photo,
          "photos"
        );
      }

      if (files.vehicle_papers) {
        urls.vehicle_papers_url = await uploadFile(
          files.vehicle_papers,
          "papers"
        );
      }

      if (files.roadworthiness) {
        urls.roadworthiness_url = await uploadFile(
          files.roadworthiness,
          "roadworthiness"
        );
      }

      const { error } = await supabase
        .from("driver_applications")
        .insert({
          full_name: form.full_name.trim(),
          park_id: form.park_id,
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          state: form.state,
          city: form.city.trim(),

          years_experience:
            parseInt(form.years_experience, 10) || 0,

          // Vehicle information
          vehicle_details: null,
          vehicle_type: form.vehicle_type,
          vehicle_model: form.vehicle_model.trim(),
          vehicle_year: Number(form.vehicle_year),
          vehicle_plate_number:
            form.vehicle_plate_number.trim().toUpperCase(),
          vehicle_color: form.vehicle_color.trim(),
          vehicle_capacity: Number(form.vehicle_capacity),

          // Guarantor information
          guarantor_name: form.guarantor_name.trim(),
          guarantor_phone: form.guarantor_phone.trim(),
          guarantor_address:
            form.guarantor_address.trim() || null,
          guarantor_relationship:
            form.guarantor_relationship.trim() || null,

          // Bank information
          bank_account_name:
            form.bank_account_name.trim(),
          bank_name: form.bank_name.trim(),
          bank_account_number:
            form.bank_account_number.trim(),

          // Uploaded documents
          ...urls,
        });

      if (error) throw error;

      toast({
        title: "Application submitted successfully!",
        description:
          "We'll review your application and get back to you soon.",
      });

      navigate("/driver/drive-with-us");
    } catch (err: any) {
      console.error("Application error:", err);

      toast({
        title: "Failed to submit application",
        description:
          err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-24 pb-12 bg-primary">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Driver Application
            </h1>

            <p className="text-white/80 text-lg">
              Complete the form below to apply as a Borix Express driver.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom max-w-3xl">

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-10">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center flex-1"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      step >= s.id
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > s.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      s.id
                    )}
                  </div>

                  <span
                    className={`text-xs mt-1 font-medium hidden sm:block ${
                      step >= s.id
                        ? "text-accent"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>

                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      step > s.id
                        ? "bg-accent"
                        : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border border-border">
            <AnimatePresence mode="wait">

              {/* STEP 1 */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    Personal Information
                  </h2>

                  <div>
                    <Label>Full Name *</Label>

                    <Input
                      value={form.full_name}
                      onChange={(e) =>
                        updateForm(
                          "full_name",
                          e.target.value
                        )
                      }
                      placeholder="e.g., Musa Ibrahim"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Phone Number *</Label>

                      <Input
                        value={form.phone}
                        onChange={(e) =>
                          updateForm(
                            "phone",
                            e.target.value
                          )
                        }
                        placeholder="+234..."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Email Address *</Label>

                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          updateForm(
                            "email",
                            e.target.value
                          )
                        }
                        placeholder="email@example.com"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Residential Address *</Label>

                    <Textarea
                      value={form.address}
                      onChange={(e) =>
                        updateForm(
                          "address",
                          e.target.value
                        )
                      }
                      placeholder="Your full address"
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Operating Park *</Label>

                    <Select
                      value={form.park_id}
                      onValueChange={(v) =>
                        updateForm("park_id", v)
                      }
                      disabled={loadingParks}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue
                          placeholder={
                            loadingParks
                              ? "Loading parks..."
                              : "Select the park you operate from"
                          }
                        />
                      </SelectTrigger>

                      <SelectContent>
                        {parks.map((park) => (
                          <SelectItem
                            key={park.id}
                            value={park.id}
                          >
                            {park.name} — {park.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>State *</Label>

                      <Select
                        value={form.state}
                        onValueChange={(v) =>
                          updateForm("state", v)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>

                        <SelectContent>
                          {nigerianStates.map((state) => (
                            <SelectItem
                              key={state}
                              value={state}
                            >
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>City *</Label>

                      <Input
                        value={form.city}
                        onChange={(e) =>
                          updateForm(
                            "city",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Jos"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Vehicle & Experience
                    </h2>

                    <p className="text-sm text-muted-foreground mt-1">
                      Enter the vehicle you will use for Borix Express trips.
                    </p>
                  </div>

                  <div>
                    <Label>Years of Driving Experience *</Label>

                    <Input
                      type="number"
                      min="0"
                      value={form.years_experience}
                      onChange={(e) =>
                        updateForm(
                          "years_experience",
                          e.target.value
                        )
                      }
                      placeholder="e.g., 5"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Vehicle Type *</Label>

                    <Select
                      value={form.vehicle_type}
                      onValueChange={(v) =>
                        updateForm("vehicle_type", v)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="Sienna">
                          Toyota Sienna
                        </SelectItem>

                        <SelectItem value="Sharon">
                          Toyota Sharon
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Vehicle Model *</Label>

                    <Input
                      value={form.vehicle_model}
                      onChange={(e) =>
                        updateForm(
                          "vehicle_model",
                          e.target.value
                        )
                      }
                      placeholder="e.g., Toyota Sienna XLE"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Vehicle Year *</Label>

                      <Input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        value={form.vehicle_year}
                        onChange={(e) =>
                          updateForm(
                            "vehicle_year",
                            e.target.value
                          )
                        }
                        placeholder="e.g., 2015"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Vehicle Color *</Label>

                      <Input
                        value={form.vehicle_color}
                        onChange={(e) =>
                          updateForm(
                            "vehicle_color",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Silver"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Plate Number *</Label>

                    <Input
                      value={form.vehicle_plate_number}
                      onChange={(e) =>
                        updateForm(
                          "vehicle_plate_number",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="e.g., ABC-123-XY"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Passenger Capacity *</Label>

                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={form.vehicle_capacity}
                      onChange={(e) =>
                        updateForm(
                          "vehicle_capacity",
                          e.target.value
                        )
                      }
                      placeholder="e.g., 7"
                      className="mt-1"
                    />

                    <p className="text-sm text-muted-foreground mt-1">
                      Enter the total number of passenger seats in the vehicle.
                    </p>
                  </div>

                  <div className="rounded-xl bg-muted p-4">
                    <div className="flex items-start gap-3">
                      <Car className="w-5 h-5 mt-0.5 text-accent" />

                      <div>
                        <h3 className="font-semibold text-foreground">
                          Vehicle information
                        </h3>

                        <p className="text-sm text-muted-foreground mt-1">
                          This vehicle information will be used by Borix Express
                          when your trips are created. You will not need to
                          register the vehicle again for each trip.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    Upload Documents
                  </h2>

                  {[
                    {
                      key: "drivers_license" as keyof ApplicationFiles,
                      label: "Driver's License *",
                    },
                    {
                      key: "nin" as keyof ApplicationFiles,
                      label: "NIN Document *",
                    },
                    {
                      key: "passport_photo" as keyof ApplicationFiles,
                      label: "Passport Photograph *",
                    },
                    {
                      key: "vehicle_papers" as keyof ApplicationFiles,
                      label: "Vehicle Papers (if owned)",
                    },
                    {
                      key: "roadworthiness" as keyof ApplicationFiles,
                      label: "Roadworthiness Certificate (optional)",
                    },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <Label>{label}</Label>

                      <div className="mt-1 relative">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) =>
                            handleFileChange(
                              key,
                              e.target.files?.[0] || null
                            )
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        <div
                          className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                            files[key]
                              ? "border-accent bg-accent/5"
                              : "border-border bg-muted/50"
                          }`}
                        >
                          {files[key] ? (
                            <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                          ) : (
                            <Upload className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}

                          <span
                            className={`text-sm truncate ${
                              files[key]
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {files[key]
                              ? files[key]!.name
                              : "Click to upload"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    Guarantor & Bank Details
                  </h2>

                  <div className="bg-muted rounded-xl p-4 mb-2">
                    <h3 className="font-semibold text-foreground mb-3">
                      Guarantor Information
                    </h3>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Guarantor Name *</Label>

                          <Input
                            value={form.guarantor_name}
                            onChange={(e) =>
                              updateForm(
                                "guarantor_name",
                                e.target.value
                              )
                            }
                            placeholder="Full name"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Guarantor Phone *</Label>

                          <Input
                            value={form.guarantor_phone}
                            onChange={(e) =>
                              updateForm(
                                "guarantor_phone",
                                e.target.value
                              )
                            }
                            placeholder="+234..."
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Guarantor Address</Label>

                        <Input
                          value={form.guarantor_address}
                          onChange={(e) =>
                            updateForm(
                              "guarantor_address",
                              e.target.value
                            )
                          }
                          placeholder="Address"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Relationship</Label>

                        <Input
                          value={form.guarantor_relationship}
                          onChange={(e) =>
                            updateForm(
                              "guarantor_relationship",
                              e.target.value
                            )
                          }
                          placeholder="e.g., Uncle, Former employer"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-xl p-4">
                    <h3 className="font-semibold text-foreground mb-3">
                      Bank Details
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <Label>Account Name *</Label>

                        <Input
                          value={form.bank_account_name}
                          onChange={(e) =>
                            updateForm(
                              "bank_account_name",
                              e.target.value
                            )
                          }
                          placeholder="As on your bank account"
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Bank Name *</Label>

                          <Input
                            value={form.bank_name}
                            onChange={(e) =>
                              updateForm(
                                "bank_name",
                                e.target.value
                              )
                            }
                            placeholder="e.g., First Bank"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label>Account Number *</Label>

                          <Input
                            value={form.bank_account_number}
                            onChange={(e) =>
                              updateForm(
                                "bank_account_number",
                                e.target.value.replace(/\D/g, "")
                              )
                            }
                            placeholder="10-digit number"
                            className="mt-1"
                            maxLength={10}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() =>
                  setStep((s) => Math.max(s - 1, 1))
                }
                disabled={step === 1 || submitting}
                className="font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={submitting}
                  className="font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DriverApplication;