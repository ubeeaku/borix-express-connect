import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Download,
  MapPin,
  Calendar,
  Clock,
  User,
  Bus,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { usePaystack } from "@/hooks/usePaystack";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Confirmation = () => {
  const [searchParams] = useSearchParams();
  const { verifyPayment, isLoading } = usePaystack();

  const [bookingDetails, setBookingDetails] = useState<any>(null);

  const [paymentStatus, setPaymentStatus] = useState<
    "loading" | "success" | "failed"
  >("loading");

  // --------------------------------------------------
  // Ticket PDF reference
  // --------------------------------------------------

  const ticketRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------
  // Download Ticket
  // --------------------------------------------------

  const downloadTicket = async () => {
    console.log("[Confirmation] DOWNLOAD BUTTON CLICKED");

    if (!ticketRef.current) {
      console.error("[Confirmation] Ticket element not found");
      alert("Unable to generate ticket. Please refresh the page and try again.");
      return;
    }

    console.log(
      "[Confirmation] Ticket element found:",
      ticketRef.current
    );

    try {
      console.log("[Confirmation] Starting html2canvas...");

      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      console.log(
        "[Confirmation] Canvas created:",
        canvas.width,
        canvas.height
      );

      const imageData = canvas.toDataURL("image/png");

      console.log("[Confirmation] Image created");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      console.log("[Confirmation] PDF created");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;

      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      let imageWidth = maxWidth;
      let imageHeight =
        (canvas.height * imageWidth) / canvas.width;

      // Make sure the ticket fits on one A4 page.
      if (imageHeight > maxHeight) {
        imageHeight = maxHeight;
        imageWidth =
          (canvas.width * imageHeight) / canvas.height;
      }

      const x = (pageWidth - imageWidth) / 2;
      const y = margin;

      pdf.addImage(
        imageData,
        "PNG",
        x,
        y,
        imageWidth,
        imageHeight
      );

      const ticketId =
        bookingDetails?.ticketId || "ticket";

      pdf.save(`Borix-Express-${ticketId}.pdf`);

      console.log(
        "[Confirmation] PDF downloaded successfully"
      );
    } catch (error) {
      console.error(
        "[Confirmation] PDF generation failed:",
        error
      );

      alert(
        `PDF generation failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }
  };

  // --------------------------------------------------
  // Payment verification
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const verifyTransaction = async () => {
      const reference =
        searchParams.get("reference") ||
        searchParams.get("trxref") ||
        sessionStorage.getItem("paystack_reference");

      console.log(
        "[Confirmation] Payment reference:",
        reference
      );

      if (!reference) {
        if (!cancelled) {
          setPaymentStatus("failed");
        }
        return;
      }

      try {
        const result = await verifyPayment(reference);

        console.log(
          "[Confirmation] Paystack verification result:",
          result
        );

        console.log(
          "[Confirmation] Reference:",
          reference
        );

        if (cancelled) return;

        // --------------------------------------------------
        // Successful payment
        // --------------------------------------------------

        if (
          result.success &&
          result.status === "completed"
        ) {
          const details = {
            ticketId:
              result.booking?.booking_reference ||
              reference,

            origin:
              result.booking?.routes?.origin ||
              "Jos",

            destination:
              result.booking?.routes?.destination ||
              "Abuja",

            date:
              result.booking?.travel_date
                ? new Date(
                    result.booking.travel_date
                  ).toLocaleDateString("en-NG", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "",

            time:
              result.booking?.departure_time ||
              "",

            passenger:
              result.booking?.passenger_name ||
              "Guest",

            seats:
              result.booking?.number_of_seats ||
              1,

            price:
              result.booking?.total_amount ||
              0,
          };

          console.log(
            "[Confirmation] Booking details:",
            details
          );

          // Save details in React state.
          setBookingDetails(details);

          // Save details in session storage as backup.
          sessionStorage.setItem(
            "verified_paystack_reference",
            reference
          );

          sessionStorage.setItem(
            "verified_booking_details",
            JSON.stringify(details)
          );

          sessionStorage.removeItem(
            "paystack_reference"
          );

          setPaymentStatus("success");

          return;
        }

        // --------------------------------------------------
        // Pending payment
        // --------------------------------------------------

        if (result.status === "pending") {
          console.log(
            "[Confirmation] Payment still pending"
          );

          setPaymentStatus("loading");
          return;
        }

        // --------------------------------------------------
        // Failed payment
        // --------------------------------------------------

        console.error(
          "[Confirmation] Payment verification failed:",
          result.error
        );

        setPaymentStatus("failed");
      } catch (error) {
        console.error(
          "[Confirmation] Unexpected verification error:",
          error
        );

        if (!cancelled) {
          setPaymentStatus("failed");
        }
      }
    };

    verifyTransaction();

    return () => {
      cancelled = true;
    };
  }, [searchParams, verifyPayment]);

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (paymentStatus === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-muted">
        <Navbar />

        <section className="pt-32 pb-20">
          <div className="container-custom max-w-2xl">
            <div className="bg-card rounded-3xl shadow-xl p-12 text-center">
              <Loader2 className="w-16 h-16 text-accent mx-auto mb-4 animate-spin" />

              <h1 className="text-2xl font-bold text-foreground mb-2">
                Verifying Payment...
              </h1>

              <p className="text-muted-foreground">
                Please wait while we confirm your transaction.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  // --------------------------------------------------
  // Failed
  // --------------------------------------------------

  if (paymentStatus === "failed") {
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
              <div className="bg-destructive p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.2,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="w-20 h-20 bg-destructive-foreground/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <XCircle className="w-12 h-12 text-destructive-foreground" />
                </motion.div>

                <h1 className="text-2xl md:text-3xl font-bold text-destructive-foreground mb-2">
                  Payment Failed
                </h1>

                <p className="text-destructive-foreground/80">
                  We couldn't verify your payment. Please try again.
                </p>
              </div>

              <div className="p-8">
                <p className="text-center text-muted-foreground mb-6">
                  If you believe this is an error or your account was charged,
                  please contact our support team.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/booking" className="flex-1">
                    <Button
                      variant="accent"
                      className="w-full"
                    >
                      Try Again
                    </Button>
                  </Link>

                  <Link to="/contact" className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  // --------------------------------------------------
  // Successful Booking
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />

      <section className="pt-32 pb-20">
        <div className="container-custom max-w-2xl">

          {/* ==================================================
              THIS IS THE TICKET AREA
              html2canvas captures everything inside this div.
              ================================================== */}

          <motion.div
            ref={ticketRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-3xl shadow-xl overflow-hidden"
          >

            {/* Success Header */}

            <div className="bg-primary p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>

              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Booking Confirmed!
              </h1>

              <p className="text-white/80">
                Your ticket has been successfully confirmed
              </p>
            </div>

            {/* Ticket Details */}

            <div className="p-8">

              {/* Ticket ID */}

              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground mb-1">
                  Ticket ID
                </p>

                <p className="text-2xl font-mono font-bold text-foreground tracking-wider">
                  {bookingDetails?.ticketId || "—"}
                </p>
              </div>

              {/* Journey Details */}

              <div className="bg-muted rounded-2xl p-6 mb-6">

                <div className="flex items-center justify-center gap-4 mb-6">

                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">
                      {bookingDetails?.origin || "—"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Origin
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-accent" />

                    <Bus className="w-6 h-6 text-accent" />

                    <div className="w-8 h-0.5 bg-accent" />
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-bold text-foreground">
                      {bookingDetails?.destination || "—"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Destination
                    </p>
                  </div>

                </div>

                <div className="grid md:grid-cols-2 gap-4">

                  {/* Date */}

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-accent" />

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Date
                      </p>

                      <p className="font-medium text-foreground">
                        {bookingDetails?.date || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Departure */}

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-accent" />

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Departure
                      </p>

                      <p className="font-medium text-foreground">
                        {bookingDetails?.time || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Passenger */}

                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-accent" />

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Passenger
                      </p>

                      <p className="font-medium text-foreground">
                        {bookingDetails?.passenger || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Seats */}

                  <div className="flex items-center gap-3">
                    <Bus className="w-5 h-5 text-accent" />

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Seat(s)
                      </p>

                      <p className="font-medium text-foreground">
                        {bookingDetails?.seats || "—"}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Pickup Location */}

              <div className="flex items-start gap-3 p-4 bg-accent/10 rounded-xl mb-6">

                <MapPin className="w-5 h-5 text-accent mt-0.5" />

                <div>
                  <p className="font-semibold text-foreground">
                    Pickup Location
                  </p>

                  <p className="text-muted-foreground">
                    Terminal, {bookingDetails?.origin || "—"}
                  </p>
                </div>

              </div>

              {/* Amount Paid */}

              <div className="flex justify-between items-center p-4 bg-primary rounded-xl mb-8">

                <span className="text-white font-medium">
                  Amount Paid
                </span>

                <span className="text-2xl font-bold text-accent">
                  ₦
                  {Number(
                    bookingDetails?.price || 0
                  ).toLocaleString()}
                </span>

              </div>

              {/* Important Notes */}

              <div className="border-t border-border pt-6">

                <h3 className="font-semibold text-foreground mb-3">
                  Important Notes
                </h3>

                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>
                    • Please arrive at the terminal at least 30 minutes before departure
                  </li>

                  <li>
                    • Bring a valid ID along with this ticket
                  </li>

                  <li>
                    • For cancellations, contact us at least 24 hours before departure
                  </li>

                  <li>
                    • Maximum luggage allowance: 2 bags (50kg total)
                  </li>
                </ul>

              </div>

              {/* ==================================================
                  ACTION BUTTONS
                  These are excluded from the generated PDF.
                  ================================================== */}

              <div
                className="flex flex-col sm:flex-row gap-4 mt-8"
                data-html2canvas-ignore="true"
              >

                <Button
                  type="button"
                  variant="accent"
                  className="flex-1"
                  onClick={downloadTicket}
                >
                  <Download className="w-4 h-4" />
                  Download Ticket
                </Button>

                <Link to="/" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full"
                  >
                    Back to Home
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

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