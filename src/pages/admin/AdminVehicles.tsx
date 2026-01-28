import { useState } from "react";
import { motion } from "framer-motion";
import { Car, Plus, Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
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
const mockVehicles = [
  { id: "1", plateNumber: "JOS-123-AB", model: "Toyota Hiace", capacity: 5, status: "active" },
  { id: "2", plateNumber: "JOS-456-CD", model: "Toyota Hiace", capacity: 5, status: "active" },
  { id: "3", plateNumber: "JOS-789-EF", model: "Toyota Hiace", capacity: 5, status: "maintenance" },
  { id: "4", plateNumber: "ABJ-321-GH", model: "Toyota Hiace", capacity: 5, status: "active" },
  { id: "5", plateNumber: "ABJ-654-IJ", model: "Toyota Hiace", capacity: 5, status: "active" },
];

const AdminVehicles = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [vehicles, setVehicles] = useState(mockVehicles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<typeof mockVehicles[0] | null>(null);
  const [formData, setFormData] = useState({
    plateNumber: "",
    model: "",
    capacity: "5",
    status: "active",
  });

  const handleSubmit = () => {
    if (!formData.plateNumber || !formData.model) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (selectedVehicle) {
      setVehicles(vehicles.map(v => 
        v.id === selectedVehicle.id 
          ? { ...v, ...formData, capacity: parseInt(formData.capacity) }
          : v
      ));
      toast({ title: "Vehicle updated successfully" });
    } else {
      setVehicles([
        ...vehicles,
        {
          id: Date.now().toString(),
          ...formData,
          capacity: parseInt(formData.capacity),
        },
      ]);
      toast({ title: "Vehicle added successfully" });
    }

    setDialogOpen(false);
    setSelectedVehicle(null);
    setFormData({ plateNumber: "", model: "", capacity: "5", status: "active" });
  };

  const handleEdit = (vehicle: typeof mockVehicles[0]) => {
    setSelectedVehicle(vehicle);
    setFormData({
      plateNumber: vehicle.plateNumber,
      model: vehicle.model,
      capacity: vehicle.capacity.toString(),
      status: vehicle.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setVehicles(vehicles.filter(v => v.id !== id));
    toast({ title: "Vehicle removed successfully" });
  };

  if (authLoading || !isAdmin) return null;

  return (
    <AdminLayout title="Vehicles" subtitle="Manage your fleet">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {vehicles.filter(v => v.status === "active").length} Active
              </Badge>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                {vehicles.filter(v => v.status === "maintenance").length} Maintenance
              </Badge>
            </div>
          </div>
          <Button
            onClick={() => {
              setSelectedVehicle(null);
              setFormData({ plateNumber: "", model: "", capacity: "5", status: "active" });
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
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
                <TableHead>Plate Number</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-mono font-medium">{vehicle.plateNumber}</TableCell>
                  <TableCell>{vehicle.model}</TableCell>
                  <TableCell>{vehicle.capacity} seats</TableCell>
                  <TableCell>
                    {vehicle.status === "active" ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                        <XCircle className="w-3 h-3 mr-1" />
                        Maintenance
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(vehicle)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(vehicle.id)}>
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
            <DialogTitle>{selectedVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plate Number</Label>
              <Input
                value={formData.plateNumber}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                placeholder="e.g., JOS-123-AB"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Model</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Toyota Hiace"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
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
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedVehicle ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminVehicles;
