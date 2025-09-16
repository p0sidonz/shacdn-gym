import { useState, useEffect, Fragment } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Shield, 
  Users, 
  Edit, 
  Save,
  UserCheck,
  Settings,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

interface Permission {
  id: string
  module: string
  action: string
  description: string
}

interface RolePermission {
  role: UserRole
  permissions: string[]
}

const DEFAULT_PERMISSIONS: Permission[] = [
  { id: 'members.view', module: 'Members', action: 'View', description: 'View member list and details' },
  { id: 'members.create', module: 'Members', action: 'Create', description: 'Add new members' },
  { id: 'members.edit', module: 'Members', action: 'Edit', description: 'Edit member information' },
  { id: 'members.delete', module: 'Members', action: 'Delete', description: 'Delete members' },
  
  { id: 'staff.view', module: 'Staff', action: 'View', description: 'View staff list and details' },
  { id: 'staff.create', module: 'Staff', action: 'Create', description: 'Add new staff members' },
  { id: 'staff.edit', module: 'Staff', action: 'Edit', description: 'Edit staff information' },
  { id: 'staff.delete', module: 'Staff', action: 'Delete', description: 'Remove staff members' },
  
  { id: 'packages.view', module: 'Packages', action: 'View', description: 'View membership packages' },
  { id: 'packages.create', module: 'Packages', action: 'Create', description: 'Create new packages' },
  { id: 'packages.edit', module: 'Packages', action: 'Edit', description: 'Edit package details' },
  { id: 'packages.delete', module: 'Packages', action: 'Delete', description: 'Remove packages' },
  
  { id: 'payments.view', module: 'Payments', action: 'View', description: 'View payment records' },
  { id: 'payments.process', module: 'Payments', action: 'Process', description: 'Process payments and refunds' },
  { id: 'payments.reports', module: 'Payments', action: 'Reports', description: 'Access payment reports' },
  
  { id: 'reports.financial', module: 'Reports', action: 'Financial', description: 'View financial reports' },
  { id: 'reports.attendance', module: 'Reports', action: 'Attendance', description: 'View attendance reports' },
  { id: 'reports.performance', module: 'Reports', action: 'Performance', description: 'View performance reports' },
  
  { id: 'settings.gym', module: 'Settings', action: 'Gym', description: 'Manage gym settings' },
  { id: 'settings.permissions', module: 'Settings', action: 'Permissions', description: 'Manage role permissions' },
]

const DEFAULT_ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'gym_owner',
    permissions: DEFAULT_PERMISSIONS.map(p => p.id) // All permissions
  },
  {
    role: 'manager',
    permissions: [
      'members.view', 'members.create', 'members.edit',
      'staff.view', 'staff.edit',
      'packages.view', 'packages.create', 'packages.edit',
      'payments.view', 'payments.process',
      'reports.financial', 'reports.attendance', 'reports.performance'
    ]
  },
  {
    role: 'trainer',
    permissions: [
      'members.view',
      'payments.view',
      'reports.attendance'
    ]
  },
  {
    role: 'nutritionist',
    permissions: [
      'members.view',
      'reports.attendance'
    ]
  },
  {
    role: 'receptionist',
    permissions: [
      'members.view', 'members.create', 'members.edit',
      'payments.view', 'payments.process',
      'packages.view'
    ]
  },
  {
    role: 'housekeeping',
    permissions: [
      'reports.attendance'
    ]
  }
]

export default function PermissionManager() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>(DEFAULT_ROLE_PERMISSIONS)
  const [editingRole, setEditingRole] = useState<UserRole | null>(null)
  const [tempPermissions, setTempPermissions] = useState<string[]>([])
  const [gymId, setGymId] = useState<string | null>(null)

  useEffect(() => {
    loadPermissions()
  }, [user?.id])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      
      // Get gym_id from owner
      const { data: gym } = await supabase
        .from('gyms')
        .select('id')
        .eq('owner_id', user?.id)
        .single()

      if (gym) {
        setGymId(gym.id)
        
        // Load custom permissions if they exist
        const { data: customPermissions } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('gym_id', gym.id)

        if (customPermissions && customPermissions.length > 0) {
          const rolePerms = customPermissions.reduce((acc: RolePermission[], perm) => {
            const existingRole = acc.find(r => r.role === perm.role)
            if (existingRole) {
              existingRole.permissions.push(perm.permission_id)
            } else {
              acc.push({
                role: perm.role,
                permissions: [perm.permission_id]
              })
            }
            return acc
          }, [])
          
          setRolePermissions(rolePerms)
        }
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (role: UserRole) => {
    const rolePerms = rolePermissions.find(r => r.role === role)
    setEditingRole(role)
    setTempPermissions(rolePerms?.permissions || [])
  }

  const cancelEditing = () => {
    setEditingRole(null)
    setTempPermissions([])
  }

  const togglePermission = (permissionId: string) => {
    setTempPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    )
  }

  const savePermissions = async () => {
    if (!editingRole || !gymId) return

    try {
      // Delete existing permissions for this role
      await supabase
        .from('role_permissions')
        .delete()
        .eq('gym_id', gymId)
        .eq('role', editingRole)

      // Insert new permissions
      if (tempPermissions.length > 0) {
        const permissionsToInsert = tempPermissions.map(permId => ({
          gym_id: gymId,
          role: editingRole,
          permission_id: permId
        }))

        const { error } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert)

        if (error) throw error
      }

      // Update local state
      setRolePermissions(prev => 
        prev.map(r => 
          r.role === editingRole 
            ? { ...r, permissions: tempPermissions }
            : r
        )
      )

      setEditingRole(null)
      setTempPermissions([])
      alert('Permissions updated successfully!')
    } catch (error) {
      console.error('Error saving permissions:', error)
      alert('Failed to save permissions')
    }
  }

  const getPermissionsByModule = () => {
    const modules: { [key: string]: Permission[] } = {}
    DEFAULT_PERMISSIONS.forEach(perm => {
      if (!modules[perm.module]) {
        modules[perm.module] = []
      }
      modules[perm.module].push(perm)
    })
    return modules
  }

  const hasPermission = (role: UserRole, permissionId: string) => {
    const rolePerms = rolePermissions.find(r => r.role === role)
    return rolePerms?.permissions.includes(permissionId) || false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading permissions...</span>
      </div>
    )
  }

  const modulePermissions = getPermissionsByModule()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permission Management</h1>
          <p className="text-muted-foreground">
            Configure what each role can access in your gym management system
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {rolePermissions.map((roleP) => (
          <Card key={roleP.role}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                {roleP.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleP.permissions.length}</div>
              <p className="text-xs text-muted-foreground">permissions</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 w-full"
                    onClick={() => startEditing(roleP.role)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Edit Permissions for {roleP.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </DialogTitle>
                    <DialogDescription>
                      Select which actions this role can perform in the system
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 mt-4">
                    {Object.entries(modulePermissions).map(([module, permissions]) => (
                      <div key={module}>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          {module}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {permissions.map((perm) => (
                            <div key={perm.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                              <input
                                type="checkbox"
                                id={perm.id}
                                checked={editingRole ? tempPermissions.includes(perm.id) : hasPermission(roleP.role, perm.id)}
                                onChange={() => editingRole && togglePermission(perm.id)}
                                disabled={!editingRole}
                                className="rounded"
                              />
                              <div className="flex-1">
                                <label htmlFor={perm.id} className="text-sm font-medium cursor-pointer">
                                  {perm.action}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  {perm.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {editingRole === roleP.role && (
                    <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                      <Button variant="outline" onClick={cancelEditing}>
                        Cancel
                      </Button>
                      <Button onClick={savePermissions}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Permissions
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
          <CardDescription>
            Overview of all role permissions across different modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module / Action</TableHead>
                {rolePermissions.map((roleP) => (
                  <TableHead key={roleP.role} className="text-center">
                    {roleP.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(modulePermissions).map(([module, permissions]) => (
                <Fragment key={module}>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={rolePermissions.length + 1} className="font-semibold">
                      {module}
                    </TableCell>
                  </TableRow>
                  {permissions.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{perm.action}</p>
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        </div>
                      </TableCell>
                      {rolePermissions.map((roleP) => (
                        <TableCell key={roleP.role} className="text-center">
                          {hasPermission(roleP.role, perm.id) ? (
                            <Badge variant="default" className="text-xs">✓</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">✗</Badge>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
