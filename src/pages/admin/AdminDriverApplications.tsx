import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ApplicationStatus = "pending" | "approved" | "rejected" | "suspended";

type Application = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string;
  state: string;
  city: string;
  park_id: string | null;
  years_experience: number;
  vehicle_ownership: string;
  vehicle_details: string | null;
  guarantor_name: string;
  guarantor_phone: string;
  guarantor_address: string | null;
  guarantor_relationship: string | null;
  bank_account_name: string;
  bank_name: string;
  bank_account_number: string;
  drivers_license_url: string | null;
  nin_url: string | null;
  passport_photo_url: string | null;
  vehicle_papers_url: string | null;
  roadworthiness_url: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
};

type Park = {
  id: string;
  name: string;
  city: string;
  status: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-100 text-gray-700",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  suspended: XCircle,
};

const AdminDriverApplications = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [parks, setParks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchParks = async () => {
    const { data, error } = await supabase
      .from("parks")
      .select("id, name, city, status")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load parks:", error);
      return;
    }

    const parkMap: Record<string, string> = {};

    (data ?? []).forEach((park) => {
      parkMap[park.id] = `${park.name} — ${park.city}`;
    });

    setParks(parkMap);
  };

  const fetchApplications = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("driver_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load applications:", error);

      toast({
        title: "Failed to load applications",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setApplications((data ?? []) as Application[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;

    fetchApplications();
    fetchParks();
  }, [isAdmin]);

  const updateStatus = async (
  id: string,
  status: ApplicationStatus
) => {
    setUpdating(true);

    const app = applications.find((a) => a.id === id);

    if (!app) {
      toast({
        title: "Application not found",
        variant: "destructive",
      });
      setUpdating(false);
      return;
    }

    if (status === "approved" && !app.park_id) {
      toast({
        title: "Operating park required",
        description:
          "This application has no operating park assigned. Ask the applicant to select a park before approval.",
        variant: "destructive",
      });
      setUpdating(false);
      return;
    }

    try {
      const { error: applicationError } = await supabase
        .from("driver_applications")
        .update({status,admin_notes: adminNotes.trim() || null,})
        .eq("id", id);

      if (applicationError) {
        throw applicationError;
      }

      /*
       * When an application is approved, create or update the
       * corresponding operational driver record.
       *
       * A user_id is intentionally left null here. The driver
       * authentication account can be linked separately.
       */
      if (status === "approved") {
        const { data: existingDriver, error: lookupError } = await supabase
          .from("drivers")
          .select("id")
          .eq("application_id", app.id)
          .maybeSingle();

        if (lookupError) {
          throw lookupError;
        }

        if (existingDriver) {
          const { error: driverUpdateError } = await supabase
            .from("drivers")
            .update({
              full_name: app.full_name,
              phone: app.phone,
              email: app.email || null,
              park_id: app.park_id,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingDriver.id);

          if (driverUpdateError) {
            throw driverUpdateError;
          }
        } else {
          const { error: driverInsertError } = await supabase
            .from("drivers")
            .insert({
              user_id: null,
              application_id: app.id,
              full_name: app.full_name,
              phone: app.phone,
              email: app.email || null,
              park_id: app.park_id,
              status: "active",
            });

          if (driverInsertError) {
            throw driverInsertError;
          }
        }
      }

      toast({
        title: `Application ${status}`,
        description:
          status === "approved"
            ? `${app.full_name} has been added as an active driver.`
            : undefined,
      });

      // Send SMS notification
      if (app.phone) {
        const smsMessages: Record<string, string> = {
          approved: `Congratulations ${app.full_name}! Your Borix Express driver application has been approved. You will receive login details shortly.`,
          rejected: `Dear ${app.full_name}, unfortunately your Borix Express driver application was not approved at this time. Please contact us for more info.`,
          suspended: `Dear ${app.full_name}, your Borix Express driver account has been suspended. Please contact admin for details.`,
        };

        if (smsMessages[status]) {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-driver-sms`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                  phone: app.phone,
                  message: smsMessages[status],
                  type: `application_${status}`,
                }),
              }
            );
          } catch (smsError) {
            console.error("SMS notification failed:", smsError);
          }
        }
      }

      await fetchApplications();
      setDetailOpen(false);
      setSelectedApp(null);
    } catch (error) {
      console.error("Status update failed:", error);

      toast({
        title: "Failed to update application",
        description:
          error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const ownershipLabel = (value: string) => {
    switch (value) {
      case "own_sienna":
        return "Owns Sienna";
      case "own_sharon":
        return "Owns Sharon";
      case "partnership":
        return "Needs Partnership";
      default:
        return value;
    }
  };

  const filtered = applications.filter((app) => {
    const query = search.toLowerCase();

    const matchSearch =
      app.full_name.toLowerCase().includes(query) ||
      (app.email ?? "").toLowerCase().includes(query) ||
      app.phone.includes(search);

    const matchStatus =
      statusFilter === "all" || app.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const openApplication = (app: Application) => {
    setSelectedApp(app);
    setAdminNotes(app.admin_notes ?? "");
    setDetailOpen(true);
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="Driver Applications"
      subtitle="Review and manage driver applications"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value.slice(0, 50))}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["pending", "approved", "rejected", "suspended"].map((status) => {
            const count = applications.filter(
              (app) => app.status === status
            ).length;

            const Icon = statusIcons[status];

            return (
              <div
                key={status}
                className={`rounded-xl p-4 ${statusColors[status]}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="font-bold capitalize">{status}</span>
                </div>

                <p className="text-2xl font-bold mt-1">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Applications Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Operating Park</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((app) => {
                    const StatusIcon = statusIcons[app.status] || Clock;

                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">
                          {app.full_name}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{app.phone}</div>

                          {app.email && (
                            <div className="text-xs text-muted-foreground">
                              {app.email}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-sm">
                          {app.park_id
                            ? parks[app.park_id] || "Unknown Park"
                            : "Not selected"}
                        </TableCell>

                        <TableCell className="text-sm">
                          {ownershipLabel(app.vehicle_ownership)}
                        </TableCell>

                        <TableCell>
                          {app.years_experience} yrs
                        </TableCell>

                        <TableCell>
                          <Badge
                            className={`${statusColors[app.status]} hover:${statusColors[app.status]}`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {app.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString()}
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openApplication(app)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>

      {/* Application Details */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  {selectedApp.full_name}'s Application
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 text-sm">
                {/* Personal */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-2 gap-3 bg-muted rounded-lg p-3">
                    <div>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      {selectedApp.phone}
                    </div>

                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      {selectedApp.email || "—"}
                    </div>

                    <div className="col-span-2">
                      <span className="text-muted-foreground">Address:</span>{" "}
                      {selectedApp.address}
                    </div>

                    <div>
                      <span className="text-muted-foreground">State:</span>{" "}
                      {selectedApp.state}
                    </div>

                    <div>
                      <span className="text-muted-foreground">City:</span>{" "}
                      {selectedApp.city}
                    </div>

                    <div className="col-span-2">
                      <span className="text-muted-foreground">
                        Operating Park:
                      </span>{" "}
                      {selectedApp.park_id
                        ? parks[selectedApp.park_id] || "Unknown Park"
                        : "Not selected"}
                    </div>
                  </div>
                </div>

                {/* Vehicle */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Vehicle & Experience
                  </h3>

                  <div className="grid grid-cols-2 gap-3 bg-muted rounded-lg p-3">
                    <div>
                      <span className="text-muted-foreground">
                        Experience:
                      </span>{" "}
                      {selectedApp.years_experience} years
                    </div>

                    <div>
                      <span className="text-muted-foreground">
                        Vehicle:
                      </span>{" "}
                      {ownershipLabel(selectedApp.vehicle_ownership)}
                    </div>

                    {selectedApp.vehicle_details && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Details:
                        </span>{" "}
                        {selectedApp.vehicle_details}
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Documents
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        label: "Driver's License",
                        url: selectedApp.drivers_license_url,
                      },
                      {
                        label: "NIN",
                        url: selectedApp.nin_url,
                      },
                      {
                        label: "Passport Photo",
                        url: selectedApp.passport_photo_url,
                      },
                      {
                        label: "Vehicle Papers",
                        url: selectedApp.vehicle_papers_url,
                      },
                      {
                        label: "Roadworthiness",
                        url: selectedApp.roadworthiness_url,
                      },
                    ].map(({ label, url }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                      >
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {label}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">
                            ❌ {label}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Guarantor */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Guarantor
                  </h3>

                  <div className="grid grid-cols-2 gap-3 bg-muted rounded-lg p-3">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      {selectedApp.guarantor_name}
                    </div>

                    <div>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      {selectedApp.guarantor_phone}
                    </div>

                    {selectedApp.guarantor_address && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Address:
                        </span>{" "}
                        {selectedApp.guarantor_address}
                      </div>
                    )}

                    {selectedApp.guarantor_relationship && (
                      <div>
                        <span className="text-muted-foreground">
                          Relationship:
                        </span>{" "}
                        {selectedApp.guarantor_relationship}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bank */}
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Bank Details
                  </h3>

                  <div className="grid grid-cols-2 gap-3 bg-muted rounded-lg p-3">
                    <div>
                      <span className="text-muted-foreground">
                        Account Name:
                      </span>{" "}
                      {selectedApp.bank_account_name}
                    </div>

                    <div>
                      <span className="text-muted-foreground">Bank:</span>{" "}
                      {selectedApp.bank_name}
                    </div>

                    <div>
                      <span className="text-muted-foreground">
                        Account No:
                      </span>{" "}
                      {selectedApp.bank_account_number}
                    </div>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <Label>Admin Notes</Label>

                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this application..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedApp.status !== "rejected" && (
                  <Button
                    variant="destructive"
                    onClick={() =>
                      updateStatus(selectedApp.id, "rejected")
                    }
                    disabled={updating}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                )}

                {selectedApp.status !== "suspended" &&
                  selectedApp.status !== "pending" && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateStatus(selectedApp.id, "suspended")
                      }
                      disabled={updating}
                    >
                      Suspend
                    </Button>
                  )}

                {selectedApp.status !== "approved" && (
                  <Button
                    onClick={() =>
                      updateStatus(selectedApp.id, "approved")
                    }
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDriverApplications;
