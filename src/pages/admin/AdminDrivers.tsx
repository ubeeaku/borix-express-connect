import { useState } from "react";
import { motion } from "framer-motion";
import { User, Plus, Pencil, Trash2, Phone, Mail, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "@/hooks/use-toast";

// Mock data - In production, this would come from the database
const mockDrivers = [
  { id: "1", name: "Musa Ibrahim", phone: "+234 803 123 4567", email: "musa@borix.com", licenseNumber: "LAG-1234567", status: "active" },
  { id: "2", name: "Chukwu Emeka", phone: "+234 805 234 5678", email: "emeka@borix.com", licenseNumber: "JOS-2345678", status: "active" },
  { id: "3", name: "Aliyu Garba", phone: "+234 806 345 6789", email: "aliyu@borix.com", licenseNumber: "ABJ-3456789", status: "off_duty" },
  { id: "4", name: "Sunday Okon", phone: "+234 807 456 7890", email: "sunday@borix.com", licenseNumber: "JOS-4567890", status: "active" },
  { id: "5", name: "Ahmed Bello", phone: "+234 808 567 8901", email: "ahmed@borix.com", licenseNumber: "ABJ-5678901", status: "active" },
];

const AdminDrivers = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [drivers, setDrivers] = useState(mockDrivers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<typeof mockDrivers[0] | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    licenseNumber: "",
    status: "active",
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.phone || !formData.licenseNumber) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (selectedDriver) {
      setDrivers(drivers.map(d => 
        d.id === selectedDriver.id ? { ...d, ...formData } : d
      ));
      toast({ title: "Driver updated successfully" });
    } else {
      setDrivers([
        ...drivers,
        { id: Date.now().toString(), ...formData },
      ]);
      toast({ title: "Driver added successfully" });
    }

    setDialogOpen(false);
    setSelectedDriver(null);
    setFormData({ name: "", phone: "", email: "", licenseNumber: "", status: "active" });
  };

  const handleEdit = (driver: typeof mockDrivers[0]) => {
    setSelectedDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      licenseNumber: driver.licenseNumber,
      status: driver.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDrivers(drivers.filter(d => d.id !== id));
    toast({ title: "Driver removed successfully" });
  };

  if (authLoading || !isAdmin) return null;

  return (
    <AdminLayout title="Drivers" subtitle="Manage driver information">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {drivers.filter(d => d.status === "active").length} Active
            </Badge>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
              {drivers.filter(d => d.status === "off_duty").length} Off Duty
            </Badge>
          </div>
          <Button
            onClick={() => {
              setSelectedDriver(null);
              setFormData({ name: "", phone: "", email: "", licenseNumber: "", status: "active" });
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Driver
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl shadow-sm overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>License No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {driver.phone}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {driver.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{driver.licenseNumber}</TableCell>
                  <TableCell>
                    {driver.status === "active" ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                        <XCircle className="w-3 h-3 mr-1" />
                        Off Duty
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(driver)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(driver.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Musa Ibrahim"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g., +234 803 123 4567"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., driver@borix.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>License Number *</Label>
              <Input
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="e.g., JOS-1234567"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedDriver ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminDrivers;
