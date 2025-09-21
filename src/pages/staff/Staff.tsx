import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Loader2,
  MoreVertical,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useGym } from "@/hooks/useGym";
import { supabase } from "@/lib/supabase";
import type { Staff, UserRole, StaffStatus } from "@/types";

export default function StaffManagement() {
  const { gym, staff, fetchStaff, createStaff, updateStaff, loading } =
    useGym();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Add Staff Form State
  const [addStaffForm, setAddStaffForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "" as UserRole,
    employeeId: "",
    salaryAmount: "",
    salaryType: "fixed",
    baseCommissionRate: "",
    hireDate: new Date().toISOString().split("T")[0],
    probationEndDate: "",
    contractEndDate: "",
    specializations: "",
    maxClients: "",
    hourlyRate: "",
    overtimeRate: "",
    experienceYears: "",
    languages: "",
    notes: "",
  });

  // Edit Staff Form State
  const [editStaffForm, setEditStaffForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "" as UserRole,
    employeeId: "",
    salaryAmount: "",
    salaryType: "fixed",
    baseCommissionRate: "",
    hireDate: "",
    probationEndDate: "",
    contractEndDate: "",
    specializations: "",
    maxClients: "",
    hourlyRate: "",
    overtimeRate: "",
    experienceYears: "",
    languages: "",
    notes: "",
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);

  useEffect(() => {
    if (gym?.id) {
      fetchStaff();
    }
  }, [gym?.id]);

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.profile?.first_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      member.profile?.last_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      member.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.profile?.phone?.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" || member.status === statusFilter;
    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const resetAddForm = () => {
    setAddStaffForm({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "" as UserRole,
      employeeId: "",
      salaryAmount: "",
      salaryType: "fixed",
      baseCommissionRate: "",
      hireDate: new Date().toISOString().split("T")[0],
      probationEndDate: "",
      contractEndDate: "",
      specializations: "",
      maxClients: "",
      hourlyRate: "",
      overtimeRate: "",
      experienceYears: "",
      languages: "",
      notes: "",
    });
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gym?.id) return;

    try {
      setSubmitLoading(true);

      const result = await createStaff({
        email: addStaffForm.email,
        password: addStaffForm.password,
        firstName: addStaffForm.firstName,
        lastName: addStaffForm.lastName,
        phone: addStaffForm.phone,
        role: addStaffForm.role,
        employeeId: addStaffForm.employeeId,
        salaryAmount: parseFloat(addStaffForm.salaryAmount),
        salaryType: addStaffForm.salaryType,
        baseCommissionRate: addStaffForm.baseCommissionRate
          ? parseFloat(addStaffForm.baseCommissionRate)
          : 0,
        hireDate: addStaffForm.hireDate,
        probationEndDate: addStaffForm.probationEndDate || undefined,
        contractEndDate: addStaffForm.contractEndDate || undefined,
        specializations: addStaffForm.specializations
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        maxClients: addStaffForm.maxClients
          ? parseInt(addStaffForm.maxClients)
          : undefined,
        hourlyRate: addStaffForm.hourlyRate
          ? parseFloat(addStaffForm.hourlyRate)
          : undefined,
        overtimeRate: addStaffForm.overtimeRate
          ? parseFloat(addStaffForm.overtimeRate)
          : undefined,
        experienceYears: addStaffForm.experienceYears
          ? parseInt(addStaffForm.experienceYears)
          : 0,
        languages: addStaffForm.languages
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        notes: addStaffForm.notes || undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      resetAddForm();
      setShowAddDrawer(false);

      const successMessage = `Staff member account created successfully!

${addStaffForm.firstName} can now log in immediately with:
• Email: ${addStaffForm.email}
• Password: ${addStaffForm.password}
• Role: ${addStaffForm.role}

The account is active and they can access their ${addStaffForm.role} dashboard right away!

Please save these credentials securely.`;

      alert(successMessage);

      console.log("✅ Staff creation successful:", {
        email: addStaffForm.email,
        role: addStaffForm.role,
        staffId: result.data?.id,
      });
    } catch (error) {
      console.error("❌ Error adding staff:", error);

      let errorMessage = "Failed to add staff member. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("CORS")) {
          errorMessage =
            "CORS Error: Please check your Supabase configuration. Make sure localhost:5173 is added to allowed origins.";
        } else if (error.message.includes("403")) {
          errorMessage =
            "Permission Error: Please check RLS policies. Run the database fix script.";
        } else if (error.message.includes("duplicate")) {
          errorMessage =
            "Email already exists. Please use a different email address.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      alert(errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateStaffStatus = async (
    staffId: string,
    status: StaffStatus,
  ) => {
    try {
      const result = await updateStaff(staffId, { status });
      if (result.error) {
        throw new Error(result.error);
      }
      alert("Staff status updated successfully!");
    } catch (error) {
      console.error("Error updating staff status:", error);
      alert("Failed to update staff status.");
    }
  };

  const handleViewStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setShowViewDialog(true);
  };

  const handleEditStaff = (staff: Staff) => {
    setSelectedStaff(staff);

    setEditStaffForm({
      firstName: staff.profile?.first_name || "",
      lastName: staff.profile?.last_name || "",
      phone: staff.profile?.phone || "",
      role: staff.role,
      employeeId: staff.employee_id,
      salaryAmount: staff.salary_amount.toString(),
      salaryType: staff.salary_type,
      baseCommissionRate: staff.base_commission_rate.toString(),
      hireDate: staff.hire_date,
      probationEndDate: staff.probation_end_date || "",
      contractEndDate: staff.contract_end_date || "",
      specializations: staff.specializations?.join(", ") || "",
      maxClients: staff.max_clients?.toString() || "",
      hourlyRate: staff.hourly_rate?.toString() || "",
      overtimeRate: staff.overtime_rate?.toString() || "",
      experienceYears: staff.experience_years?.toString() || "",
      languages: staff.languages?.join(", ") || "",
      notes: staff.notes || "",
    });

    setShowEditDrawer(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff?.id) return;

    try {
      setEditSubmitLoading(true);

      if (selectedStaff.profile?.user_id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            first_name: editStaffForm.firstName,
            last_name: editStaffForm.lastName,
            phone: editStaffForm.phone,
          })
          .eq("user_id", selectedStaff.profile.user_id);

        if (profileError) {
          throw new Error(`Profile update failed: ${profileError.message}`);
        }
      }

      const result = await updateStaff(selectedStaff.id, {
        role: editStaffForm.role,
        employee_id: editStaffForm.employeeId,
        salary_amount: parseFloat(editStaffForm.salaryAmount),
        salary_type: editStaffForm.salaryType,
        base_commission_rate: editStaffForm.baseCommissionRate
          ? parseFloat(editStaffForm.baseCommissionRate)
          : 0,
        hire_date: editStaffForm.hireDate,
        probation_end_date: editStaffForm.probationEndDate || undefined,
        contract_end_date: editStaffForm.contractEndDate || undefined,
        specializations: editStaffForm.specializations
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        max_clients: editStaffForm.maxClients
          ? parseInt(editStaffForm.maxClients)
          : undefined,
        hourly_rate: editStaffForm.hourlyRate
          ? parseFloat(editStaffForm.hourlyRate)
          : undefined,
        overtime_rate: editStaffForm.overtimeRate
          ? parseFloat(editStaffForm.overtimeRate)
          : undefined,
        experience_years: editStaffForm.experienceYears
          ? parseInt(editStaffForm.experienceYears)
          : 0,
        languages: editStaffForm.languages
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        notes: editStaffForm.notes || undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setShowEditDrawer(false);
      alert("Staff member updated successfully!");
    } catch (error) {
      console.error("Error updating staff:", error);

      let errorMessage = "Failed to update staff member. Please try again.";

      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setEditSubmitLoading(false);
    }
  };

  const getStatusColor = (status: StaffStatus) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "terminated":
        return "destructive";
      case "on_leave":
        return "outline";
      case "probation":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: StaffStatus) => {
    return status.replace("_", " ");
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "manager":
        return "default";
      case "trainer":
        return "secondary";
      case "nutritionist":
        return "outline";
      case "receptionist":
        return "secondary";
      case "housekeeping":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Mobile Staff Card Component
  const StaffCard = ({ member }: { member: Staff }) => (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base">
              {member.profile?.first_name} {member.profile?.last_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {member.employee_id}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewStaff(member)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  handleUpdateStaffStatus(
                    member.id,
                    member.status === "active" ? "inactive" : "active",
                  )
                }
              >
                <Filter className="h-4 w-4 mr-2" />
                {member.status === "active" ? "Mark Inactive" : "Mark Active"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={getRoleColor(member.role)}>
              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </Badge>
            <Badge variant={getStatusColor(member.status)}>
              {getStatusLabel(member.status)}
            </Badge>
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <Phone className="h-3 w-3 mr-1" />
            {member.profile?.phone}
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="h-3 w-3 mr-1" />
            {formatCurrency(member.salary_amount)} ({member.salary_type})
          </div>

          {member.specializations && member.specializations.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {member.specializations.join(", ")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading staff...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage all your gym staff - managers, trainers, nutritionists,
            receptionists, and support team
          </p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            For detailed trainer management with specialized features, visit the
            Trainers section
          </p>
        </div>

        <Drawer open={showAddDrawer} onOpenChange={setShowAddDrawer}>
          <DrawerTrigger asChild>
            <Button className="w-full md:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[95vh]">
            <DrawerHeader className="border-b">
              <DrawerTitle>Add New Staff Member</DrawerTitle>
              <DrawerDescription>
                Create a new staff account with role-specific permissions
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto p-4">
              <form
                onSubmit={handleAddStaff}
                className="space-y-6"
                id="add-staff-form"
              >
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger
                      value="personal"
                      className="text-xs md:text-sm"
                    >
                      Personal
                    </TabsTrigger>
                    <TabsTrigger value="job" className="text-xs md:text-sm">
                      Job
                    </TabsTrigger>
                    <TabsTrigger
                      value="professional"
                      className="text-xs md:text-sm"
                    >
                      Professional
                    </TabsTrigger>
                    <TabsTrigger
                      value="additional"
                      className="text-xs md:text-sm"
                    >
                      Additional
                    </TabsTrigger>
                  </TabsList>

                  {/* Personal Information Tab */}
                  <TabsContent value="personal" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={addStaffForm.firstName}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              firstName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={addStaffForm.lastName}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              lastName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={addStaffForm.email}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          value={addStaffForm.phone}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={addStaffForm.password}
                        onChange={(e) =>
                          setAddStaffForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        required
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                  </TabsContent>

                  {/* Job Details Tab */}
                  <TabsContent value="job" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Role *</Label>
                        <Select
                          onValueChange={(value) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              role: value as UserRole,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="trainer">Trainer</SelectItem>
                            <SelectItem value="nutritionist">
                              Nutritionist
                            </SelectItem>
                            <SelectItem value="receptionist">
                              Receptionist
                            </SelectItem>
                            <SelectItem value="housekeeping">
                              Housekeeping
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employeeId">Employee ID *</Label>
                        <Input
                          id="employeeId"
                          value={addStaffForm.employeeId}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              employeeId: e.target.value,
                            }))
                          }
                          placeholder="e.g., EMP001"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="salaryAmount">Salary Amount *</Label>
                        <Input
                          id="salaryAmount"
                          type="number"
                          value={addStaffForm.salaryAmount}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              salaryAmount: e.target.value,
                            }))
                          }
                          placeholder="25000"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="salaryType">Salary Type</Label>
                        <Select
                          onValueChange={(value) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              salaryType: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Fixed" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Monthly</SelectItem>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="commission">
                              Commission
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="baseCommissionRate">
                          Commission Rate (%)
                        </Label>
                        <Input
                          id="baseCommissionRate"
                          type="number"
                          step="0.01"
                          value={addStaffForm.baseCommissionRate}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              baseCommissionRate: e.target.value,
                            }))
                          }
                          placeholder="5.0"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="hireDate">Hire Date *</Label>
                        <Input
                          id="hireDate"
                          type="date"
                          value={addStaffForm.hireDate}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              hireDate: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="probationEndDate">
                          Probation End Date
                        </Label>
                        <Input
                          id="probationEndDate"
                          type="date"
                          value={addStaffForm.probationEndDate}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              probationEndDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contractEndDate">
                          Contract End Date
                        </Label>
                        <Input
                          id="contractEndDate"
                          type="date"
                          value={addStaffForm.contractEndDate}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              contractEndDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Professional Details Tab */}
                  <TabsContent value="professional" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="specializations">Specializations</Label>
                      <Textarea
                        id="specializations"
                        value={addStaffForm.specializations}
                        onChange={(e) =>
                          setAddStaffForm((prev) => ({
                            ...prev,
                            specializations: e.target.value,
                          }))
                        }
                        placeholder="Weight Training, Cardio, Yoga (comma separated)"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxClients">Max Clients</Label>
                        <Input
                          id="maxClients"
                          type="number"
                          value={addStaffForm.maxClients}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              maxClients: e.target.value,
                            }))
                          }
                          placeholder="20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experienceYears">
                          Experience (Years)
                        </Label>
                        <Input
                          id="experienceYears"
                          type="number"
                          value={addStaffForm.experienceYears}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              experienceYears: e.target.value,
                            }))
                          }
                          placeholder="5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hourlyRate">Hourly Rate</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          step="0.01"
                          value={addStaffForm.hourlyRate}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              hourlyRate: e.target.value,
                            }))
                          }
                          placeholder="500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="overtimeRate">Overtime Rate</Label>
                        <Input
                          id="overtimeRate"
                          type="number"
                          step="0.01"
                          value={addStaffForm.overtimeRate}
                          onChange={(e) =>
                            setAddStaffForm((prev) => ({
                              ...prev,
                              overtimeRate: e.target.value,
                            }))
                          }
                          placeholder="750"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="languages">Languages</Label>
                      <Input
                        id="languages"
                        value={addStaffForm.languages}
                        onChange={(e) =>
                          setAddStaffForm((prev) => ({
                            ...prev,
                            languages: e.target.value,
                          }))
                        }
                        placeholder="English, Hindi, Spanish (comma separated)"
                      />
                    </div>
                  </TabsContent>

                  {/* Additional Details Tab */}
                  <TabsContent value="additional" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={addStaffForm.notes}
                        onChange={(e) =>
                          setAddStaffForm((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Additional notes about the staff member..."
                        rows={3}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </form>
            </div>

            <DrawerFooter className="border-t">
              <div className="flex flex-col sm:flex-row gap-2">
                <DrawerClose asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </DrawerClose>
                <Button
                  type="submit"
                  form="add-staff-form"
                  disabled={submitLoading}
                  className="flex-1"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Staff Member"
                  )}
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
            <p className="text-xs text-muted-foreground">
              {staff.filter((s) => s.status === "active").length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trainers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter((s) => s.role === "trainer").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Professional trainers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Payroll
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                staff
                  .filter((s) => s.status === "active")
                  .reduce((sum, s) => sum + s.salary_amount, 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total active salaries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staff.filter((s) => s.status === "on_leave").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently on leave</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <CardTitle>Staff Directory</CardTitle>
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-2">
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full md:w-64"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as StaffStatus | "all")
                }
              >
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={roleFilter}
                onValueChange={(value) =>
                  setRoleFilter(value as UserRole | "all")
                }
              >
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="nutritionist">Nutritionist</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile View - Cards */}
          <div className="block md:hidden space-y-4">
            {filteredStaff.map((member) => (
              <StaffCard key={member.id} member={member} />
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Employee ID</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Contact</th>
                    <th className="text-left py-3 px-4">Salary</th>
                    <th className="text-left py-3 px-4">Hire Date</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((member) => (
                    <tr key={member.id} className="border-b">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {member.profile?.first_name}{" "}
                            {member.profile?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.specializations?.join(", ")}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{member.employee_id}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getRoleColor(member.role)}>
                          {member.role.charAt(0).toUpperCase() +
                            member.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {member.profile?.phone}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1" />
                            {member.profile?.user_id}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {formatCurrency(member.salary_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.salary_type}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {formatDate(new Date(member.hire_date))}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusColor(member.status)}>
                          {getStatusLabel(member.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewStaff(member)}
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStaff(member)}
                            title="Edit Staff"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== "all" || roleFilter !== "all"
                ? "No staff members match your search criteria"
                : "No staff members found. Add your first staff member to get started."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Staff Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
            <DialogDescription>
              View complete information for {selectedStaff?.profile?.first_name}{" "}
              {selectedStaff?.profile?.last_name}
            </DialogDescription>
          </DialogHeader>

          {selectedStaff && (
            <div className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Name
                    </Label>
                    <p className="text-lg">
                      {selectedStaff.profile?.first_name}{" "}
                      {selectedStaff.profile?.last_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Email
                    </Label>
                    <p>{selectedStaff.profile?.user_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </Label>
                    <p>{selectedStaff.profile?.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Employee ID
                    </Label>
                    <p>{selectedStaff.employee_id}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Job Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Role
                    </Label>
                    <div className="mt-1">
                      <Badge variant={getRoleColor(selectedStaff.role)}>
                        {selectedStaff.role.charAt(0).toUpperCase() +
                          selectedStaff.role.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Status
                    </Label>
                    <div className="mt-1">
                      <Badge variant={getStatusColor(selectedStaff.status)}>
                        {getStatusLabel(selectedStaff.status)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Salary
                    </Label>
                    <p>
                      {formatCurrency(selectedStaff.salary_amount)} (
                      {selectedStaff.salary_type})
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Commission Rate
                    </Label>
                    <p>{selectedStaff.base_commission_rate}%</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Hire Date
                    </Label>
                    <p>{formatDate(new Date(selectedStaff.hire_date))}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Experience
                    </Label>
                    <p>{selectedStaff.experience_years || 0} years</p>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Details */}
              {(selectedStaff.specializations?.length > 0 ||
                selectedStaff.max_clients ||
                selectedStaff.hourly_rate) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedStaff.specializations?.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Specializations
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedStaff.specializations.map((spec, index) => (
                            <Badge key={index} variant="outline">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedStaff.max_clients && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Max Clients
                        </Label>
                        <p>{selectedStaff.max_clients}</p>
                      </div>
                    )}
                    {selectedStaff.hourly_rate && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Hourly Rate
                        </Label>
                        <p>{formatCurrency(selectedStaff.hourly_rate)}</p>
                      </div>
                    )}
                    {selectedStaff.languages?.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Languages
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedStaff.languages.map(
                            (lang: string, index: number) => (
                              <Badge key={index} variant="secondary">
                                {lang}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Additional Information */}
              {selectedStaff.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedStaff.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Staff Drawer */}
      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <DrawerContent className="h-[95vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle>Edit Staff Member</DrawerTitle>
            <DrawerDescription>
              Update information for {selectedStaff?.profile?.first_name}{" "}
              {selectedStaff?.profile?.last_name}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <form
              onSubmit={handleUpdateStaff}
              className="space-y-6"
              id="edit-staff-form"
            >
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
                  <TabsTrigger value="personal" className="text-xs md:text-sm">
                    Personal
                  </TabsTrigger>
                  <TabsTrigger value="job" className="text-xs md:text-sm">
                    Job
                  </TabsTrigger>
                  <TabsTrigger
                    value="professional"
                    className="text-xs md:text-sm"
                  >
                    Professional
                  </TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editFirstName">First Name *</Label>
                      <Input
                        id="editFirstName"
                        value={editStaffForm.firstName}
                        onChange={(e) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editLastName">Last Name *</Label>
                      <Input
                        id="editLastName"
                        value={editStaffForm.lastName}
                        onChange={(e) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editPhone">Phone Number *</Label>
                    <Input
                      id="editPhone"
                      value={editStaffForm.phone}
                      onChange={(e) =>
                        setEditStaffForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </TabsContent>

                {/* Job Details Tab */}
                <TabsContent value="job" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editRole">Role *</Label>
                      <Select
                        onValueChange={(value) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            role: value as UserRole,
                          }))
                        }
                        value={editStaffForm.role}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="trainer">Trainer</SelectItem>
                          <SelectItem value="nutritionist">
                            Nutritionist
                          </SelectItem>
                          <SelectItem value="receptionist">
                            Receptionist
                          </SelectItem>
                          <SelectItem value="housekeeping">
                            Housekeeping
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editEmployeeId">Employee ID *</Label>
                      <Input
                        id="editEmployeeId"
                        value={editStaffForm.employeeId}
                        onChange={(e) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            employeeId: e.target.value,
                          }))
                        }
                        placeholder="e.g., EMP001"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editSalaryAmount">Salary Amount *</Label>
                      <Input
                        id="editSalaryAmount"
                        type="number"
                        value={editStaffForm.salaryAmount}
                        onChange={(e) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            salaryAmount: e.target.value,
                          }))
                        }
                        placeholder="25000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editSalaryType">Salary Type</Label>
                      <Select
                        onValueChange={(value) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            salaryType: value,
                          }))
                        }
                        value={editStaffForm.salaryType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Fixed" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Monthly</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="commission">Commission</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editBaseCommissionRate">
                        Commission Rate (%)
                      </Label>
                      <Input
                        id="editBaseCommissionRate"
                        type="number"
                        step="0.01"
                        value={editStaffForm.baseCommissionRate}
                        onChange={(e) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            baseCommissionRate: e.target.value,
                          }))
                        }
                        placeholder="5.0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editHireDate">Hire Date *</Label>
                    <Input
                      id="editHireDate"
                      type="date"
                      value={editStaffForm.hireDate}
                      onChange={(e) =>
                        setEditStaffForm((prev) => ({
                          ...prev,
                          hireDate: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </TabsContent>

                {/* Professional Details Tab */}
                <TabsContent value="professional" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editSpecializations">Specializations</Label>
                    <Textarea
                      id="editSpecializations"
                      value={editStaffForm.specializations}
                      onChange={(e) =>
                        setEditStaffForm((prev) => ({
                          ...prev,
                          specializations: e.target.value,
                        }))
                      }
                      placeholder="Weight Training, Cardio, Yoga (comma separated)"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editMaxClients">Max Clients</Label>
                      <Input
                        id="editMaxClients"
                        type="number"
                        value={editStaffForm.maxClients}
                        onChange={(e) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            maxClients: e.target.value,
                          }))
                        }
                        placeholder="20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editExperienceYears">
                        Experience (Years)
                      </Label>
                      <Input
                        id="editExperienceYears"
                        type="number"
                        value={editStaffForm.experienceYears}
                        onChange={(e) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            experienceYears: e.target.value,
                          }))
                        }
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editHourlyRate">Hourly Rate</Label>
                      <Input
                        id="editHourlyRate"
                        type="number"
                        step="0.01"
                        value={editStaffForm.hourlyRate}
                        onChange={(e) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            hourlyRate: e.target.value,
                          }))
                        }
                        placeholder="500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editOvertimeRate">Overtime Rate</Label>
                      <Input
                        id="editOvertimeRate"
                        type="number"
                        step="0.01"
                        value={editStaffForm.overtimeRate}
                        onChange={(e) =>
                          setEditStaffForm((prev) => ({
                            ...prev,
                            overtimeRate: e.target.value,
                          }))
                        }
                        placeholder="750"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editLanguages">Languages</Label>
                    <Input
                      id="editLanguages"
                      value={editStaffForm.languages}
                      onChange={(e) =>
                        setEditStaffForm((prev) => ({
                          ...prev,
                          languages: e.target.value,
                        }))
                      }
                      placeholder="English, Hindi, Spanish (comma separated)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editNotes">Notes</Label>
                    <Textarea
                      id="editNotes"
                      value={editStaffForm.notes}
                      onChange={(e) =>
                        setEditStaffForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Additional notes about the staff member..."
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </div>

          <DrawerFooter className="border-t">
            <div className="flex flex-col sm:flex-row gap-2">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Cancel
                </Button>
              </DrawerClose>
              <Button
                type="submit"
                form="edit-staff-form"
                disabled={editSubmitLoading}
                className="flex-1"
              >
                {editSubmitLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Staff Member"
                )}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
