import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowRight, 
  Pause, 
  Play, 
  X, 
  Edit,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { MembershipUpgradeDialog } from './MembershipUpgradeDialog'
import { MembershipDowngradeDialog } from './MembershipDowngradeDialog'
import { MembershipTransferDialog } from './MembershipTransferDialog'
import { MembershipFreezeDialog } from './MembershipFreezeDialog'
import { MembershipSuspendDialog } from './MembershipSuspendDialog'
import { EditMemberDialog } from './EditMemberDialog'
import { formatDate, formatCurrency } from '@/lib/utils'

interface MembershipManagementProps {
  member: any
  memberships: any[]
  onMembershipChanged: () => void
}

export const MembershipManagement: React.FC<MembershipManagementProps> = ({
  member,
  memberships,
  onMembershipChanged
}) => {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [selectedMembership, setSelectedMembership] = useState<any>(null)

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { className: 'bg-green-100 text-green-800', label: 'Active' },
      trial: { className: 'bg-blue-100 text-blue-800', label: 'Trial' },
      suspended: { className: 'bg-red-100 text-red-800', label: 'Suspended' },
      frozen: { className: 'bg-orange-100 text-orange-800', label: 'Frozen' },
      expired: { className: 'bg-gray-100 text-gray-800', label: 'Expired' },
      pending_payment: { className: 'bg-yellow-100 text-yellow-800', label: 'Payment Due' },
      cancelled: { className: 'bg-red-100 text-red-800', label: 'Cancelled' },
      transferred: { className: 'bg-purple-100 text-purple-800', label: 'Transferred' },
      upgraded: { className: 'bg-indigo-100 text-indigo-800', label: 'Upgraded' },
      downgraded: { className: 'bg-amber-100 text-amber-800', label: 'Downgraded' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const canPerformAction = (membership: any, action: string) => {
    const status = membership.status
    
    switch (action) {
      case 'upgrade':
      case 'downgrade':
        return ['active', 'trial'].includes(status)
      case 'transfer':
        return ['active', 'trial', 'suspended'].includes(status)
      case 'freeze':
        return ['active', 'trial'].includes(status)
      case 'unfreeze':
        return status === 'frozen'
      case 'suspend':
        return ['active', 'trial', 'frozen'].includes(status)
      case 'reactivate':
        return ['suspended', 'frozen'].includes(status)
      case 'cancel':
        return !['cancelled', 'expired', 'transferred'].includes(status)
      default:
        return false
    }
  }

  const handleActionClick = (action: string, membership: any) => {
    setActiveAction(action)
    setSelectedMembership(membership)
  }

  const closeDialog = () => {
    setActiveAction(null)
    setSelectedMembership(null)
  }

  const handleActionComplete = () => {
    onMembershipChanged()
    closeDialog()
  }

  const activeMemberships = memberships.filter(m => 
    ['active', 'trial', 'suspended', 'frozen', 'pending_payment'].includes(m.status)
  )
  
  const inactiveMemberships = memberships.filter(m => 
    ['expired', 'cancelled', 'transferred', 'upgraded', 'downgraded'].includes(m.status)
  )

  return (
    <div className="space-y-6">
      {/* Member Edit Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Member Information
            </div>
            <EditMemberDialog 
              member={member}
              onMemberUpdated={onMembershipChanged}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Member ID:</span>
              <p className="font-medium">{member.member_id}</p>
            </div>
            <div>
              <span className="text-gray-600">Joining Date:</span>
              <p className="font-medium">{formatDate(member.joining_date)}</p>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <p className="font-medium">{getStatusBadge(member.status)}</p>
            </div>
            <div>
              <span className="text-gray-600">Credit Balance:</span>
              <p className="font-medium">{formatCurrency(member.credit_balance || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memberships Management */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active Memberships ({activeMemberships.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({inactiveMemberships.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeMemberships.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No active memberships found</p>
              </CardContent>
            </Card>
          ) : (
            activeMemberships.map((membership) => (
              <Card key={membership.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>{membership.membership_packages?.name || 'Unknown Package'}</span>
                      {getStatusBadge(membership.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Upgrade */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canPerformAction(membership, 'upgrade')}
                        onClick={() => handleActionClick('upgrade', membership)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <ArrowUp className="w-4 h-4 mr-1" />
                        Upgrade
                      </Button>

                      {/* Downgrade */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canPerformAction(membership, 'downgrade')}
                        onClick={() => handleActionClick('downgrade', membership)}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        <ArrowDown className="w-4 h-4 mr-1" />
                        Downgrade
                      </Button>

                      {/* Transfer */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canPerformAction(membership, 'transfer')}
                        onClick={() => handleActionClick('transfer', membership)}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Transfer
                      </Button>

                      {/* Freeze/Unfreeze */}
                      {membership.status === 'frozen' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActionClick('unfreeze', membership)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Unfreeze
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canPerformAction(membership, 'freeze')}
                          onClick={() => handleActionClick('freeze', membership)}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Freeze
                        </Button>
                      )}

                      {/* Suspend/Reactivate */}
                      {membership.status === 'suspended' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActionClick('reactivate', membership)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canPerformAction(membership, 'suspend')}
                          onClick={() => handleActionClick('suspend', membership)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Suspend
                        </Button>
                      )}

                      {/* Cancel */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canPerformAction(membership, 'cancel')}
                        onClick={() => handleActionClick('cancel', membership)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <span className="text-gray-600">Period:</span>
                        <p className="font-medium">
                          {formatDate(membership.start_date)} - {formatDate(membership.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <p className="font-medium">
                          {formatCurrency(membership.amount_paid || 0)} / {formatCurrency(membership.total_amount_due || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <span className="text-gray-600">Remaining:</span>
                        <p className="font-medium">
                          {Math.max(0, Math.ceil((new Date(membership.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Pending:</span>
                      <p className="font-medium text-orange-600">
                        {formatCurrency(membership.amount_pending || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Freeze Info */}
                  {membership.status === 'frozen' && (
                    <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 text-orange-800">
                        <Pause className="w-4 h-4" />
                        <span className="font-medium">Membership Frozen</span>
                      </div>
                      <div className="text-sm text-orange-700 mt-1">
                        <p>Freeze Period: {formatDate(membership.freeze_start_date)} - {formatDate(membership.freeze_end_date)}</p>
                        <p>Days Used: {membership.freeze_days_used || 0}</p>
                        {membership.freeze_reason && <p>Reason: {membership.freeze_reason}</p>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {inactiveMemberships.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No membership history found</p>
              </CardContent>
            </Card>
          ) : (
            inactiveMemberships.map((membership) => (
              <Card key={membership.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{membership.membership_packages?.name || 'Unknown Package'}</span>
                      {getStatusBadge(membership.status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(membership.start_date)} - {formatDate(membership.end_date)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialogs */}
      {activeAction === 'upgrade' && selectedMembership && (
        <MembershipUpgradeDialog
          open={true}
          onOpenChange={closeDialog}
          member={member}
          currentMembership={selectedMembership}
          onUpgradeComplete={handleActionComplete}
        />
      )}

      {activeAction === 'downgrade' && selectedMembership && (
        <MembershipDowngradeDialog
          open={true}
          onOpenChange={closeDialog}
          member={member}
          currentMembership={selectedMembership}
          onDowngradeComplete={handleActionComplete}
        />
      )}

      {activeAction === 'transfer' && selectedMembership && (
        <MembershipTransferDialog
          open={true}
          onOpenChange={closeDialog}
          member={member}
          membership={selectedMembership}
          onTransferComplete={handleActionComplete}
        />
      )}

      {activeAction === 'freeze' && selectedMembership && (
        <MembershipFreezeDialog
          open={true}
          onOpenChange={closeDialog}
          membership={selectedMembership}
          onFreezeComplete={handleActionComplete}
        />
      )}

      {activeAction === 'suspend' && selectedMembership && (
        <MembershipSuspendDialog
          open={true}
          onOpenChange={closeDialog}
          membership={selectedMembership}
          action="suspend"
          onActionComplete={handleActionComplete}
        />
      )}

      {(activeAction === 'unfreeze' || activeAction === 'reactivate') && selectedMembership && (
        <MembershipSuspendDialog
          open={true}
          onOpenChange={closeDialog}
          membership={selectedMembership}
          action={activeAction}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  )
}
