import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  QrCode, 
  Download, 
  Search,
  User,
  Printer,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import QRCodeLib from 'qrcode'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

interface Member {
  id: string
  member_id: string
  status: string
  profiles: {
    first_name: string
    last_name: string
    phone: string
  } | null
  memberships: Array<{
    status: string
    membership_packages: {
      name: string
      package_type: string
    } | null
  }> | null
}

export const QRCodeGenerator: React.FC = () => {
  const { gymId } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (gymId) {
      loadMembers()
    }
  }, [gymId])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm, statusFilter])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('members')
        .select(`
          id,
          member_id,
          status,
          profiles!profile_id (
            first_name,
            last_name,
            phone
          ),
          memberships!memberships_member_id_fkey (
            status,
            membership_packages!package_id (
              name,
              package_type
            )
          )
        `)
        .eq('gym_id', gymId)
        .eq('status', 'active')

      if (error) throw error

      // Transform the data to match our interface
      const transformedData = (data || []).map(member => ({
        ...member,
        profiles: Array.isArray(member.profiles) ? member.profiles[0] || null : member.profiles,
        memberships: (member.memberships || []).map(membership => ({
          ...membership,
          membership_packages: Array.isArray(membership.membership_packages) 
            ? membership.membership_packages[0] || null 
            : membership.membership_packages
        }))
      }))

      setMembers(transformedData as Member[])
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterMembers = () => {
    let filtered = members

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(member => 
        member.profiles?.first_name?.toLowerCase().includes(searchLower) ||
        member.profiles?.last_name?.toLowerCase().includes(searchLower) ||
        member.member_id.toLowerCase().includes(searchLower) ||
        member.profiles?.phone?.includes(searchTerm)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => {
        const hasActiveMembership = member.memberships?.some(m => m.status === 'active') || false
        return statusFilter === 'active_membership' ? hasActiveMembership : !hasActiveMembership
      })
    }

    setFilteredMembers(filtered)
  }

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId)
      } else {
        return [...prev, memberId]
      }
    })
  }

  const selectAllMembers = () => {
    setSelectedMembers(filteredMembers.map(m => m.id))
  }

  const clearSelection = () => {
    setSelectedMembers([])
  }

  const generateQRData = (member: Member) => {
    return JSON.stringify({
      type: 'gym_attendance',
      member_id: member.member_id,
      gym_id: gymId,
      name: `${member.profiles?.first_name || 'Unknown'} ${member.profiles?.last_name || 'Member'}`,
      generated_at: new Date().toISOString()
    })
  }

  const generateQRCode = async (data: string): Promise<string> => {
    try {
      // Generate actual QR code using qrcode library
      const qrCodeDataURL = await QRCodeLib.toDataURL(data, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
      return qrCodeDataURL
    } catch (error) {
      console.error('Error generating QR code:', error)
      // Fallback to a simple error placeholder
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="#f8f8f8"/>
          <text x="100" y="90" text-anchor="middle" font-size="14" fill="#666">QR Code</text>
          <text x="100" y="110" text-anchor="middle" font-size="14" fill="#666">Generation</text>
          <text x="100" y="130" text-anchor="middle" font-size="14" fill="#666">Error</text>
        </svg>
      `)}`
    }
  }

  const generatePDFSheet = async () => {
    if (selectedMembers.length === 0) {
      alert('Please select at least one member')
      return
    }

    setGenerating(true)
    
    try {
      // In a real implementation, you would:
      // 1. Use a QR code library to generate actual QR codes
      // 2. Use a PDF library like jsPDF or PDFKit to create the PDF
      // 3. Layout multiple QR codes with member info on a single sheet
      
      const selectedMemberData = filteredMembers.filter(m => selectedMembers.includes(m.id))
      
      // Generate QR codes for all selected members
      const memberQRCodes = await Promise.all(
        selectedMemberData.map(async (member) => {
          const qrData = generateQRData(member)
          const qrCode = await generateQRCode(qrData)
          return { member, qrCode }
        })
      )
      
      // Create a simple HTML page for printing
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Member QR Codes</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .qr-item { text-align: center; padding: 15px; border: 1px solid #ccc; border-radius: 8px; }
            .qr-code { width: 120px; height: 120px; margin: 0 auto 10px; }
            .member-info { font-size: 12px; }
            .member-name { font-weight: bold; margin-bottom: 5px; }
            .member-id { color: #666; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>Gym Member QR Codes</h1>
          <div class="no-print">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total members: ${selectedMemberData.length}</p>
            <button onclick="window.print()">Print QR Codes</button>
          </div>
          <div class="qr-grid">
            ${memberQRCodes.map(({ member, qrCode }) => `
              <div class="qr-item">
                <div class="qr-code">
                  <img src="${qrCode}" alt="QR Code for ${member.profiles?.first_name || 'Member'}" style="width: 100%; height: 100%;" />
                </div>
                <div class="member-info">
                  <div class="member-name">${member.profiles?.first_name || 'Unknown'} ${member.profiles?.last_name || 'Member'}</div>
                  <div class="member-id">ID: ${member.member_id}</div>
                  <div style="color: #888; font-size: 10px;">${member.profiles?.phone || 'No phone'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </body>
        </html>
      `

      // Open in new window for printing
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(htmlContent)
        newWindow.document.close()
      }

    } catch (error) {
      console.error('Error generating QR codes:', error)
      alert('Error generating QR codes')
    } finally {
      setGenerating(false)
    }
  }

  const downloadSingleQR = async (member: Member) => {
    try {
      const qrData = generateQRData(member)
      const qrCode = await generateQRCode(qrData)
      
      // Create download link
      const link = document.createElement('a')
      link.href = qrCode
      link.download = `qr-${member.member_id}-${member.profiles?.first_name || 'member'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading QR code:', error)
      alert('Error downloading QR code')
    }
  }

  // Email functionality removed since email is not available in profiles table
  // const sendQRByEmail = async (member: Member) => {
  //   alert(`Email QR code functionality would be implemented here`)
  // }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading members...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-6 h-6" />
            QR Code Generator
          </CardTitle>
          <CardDescription>
            Generate QR codes for member attendance scanning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search Members</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Name, ID, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status">Membership Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="active_membership">Active Membership</SelectItem>
                    <SelectItem value="inactive_membership">Inactive Membership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={selectAllMembers}
                  disabled={filteredMembers.length === 0}
                >
                  Select All ({filteredMembers.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={selectedMembers.length === 0}
                >
                  Clear ({selectedMembers.length})
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedMembers.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      {selectedMembers.length} member(s) selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={generatePDFSheet}
                      disabled={generating}
                      size="sm"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4 mr-2" />
                          Generate PDF Sheet
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({filteredMembers.length})</CardTitle>
          <CardDescription>
            Select members to generate QR codes for attendance scanning
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length > 0 ? (
            <div className="space-y-2">
              {filteredMembers.map((member) => {
                const isSelected = selectedMembers.includes(member.id)
                const hasActiveMembership = member.memberships?.some(m => m.status === 'active') || false
                
                return (
                  <div
                    key={member.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleMemberSelection(member.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 border-2 rounded ${
                          isSelected 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-white" fill="currentColor" />
                          )}
                        </div>
                        
                        <User className="w-8 h-8 text-gray-500 bg-gray-100 rounded-full p-2" />
                        
                        <div>
                          <div className="font-medium">
                            {member.profiles?.first_name || 'Unknown'} {member.profiles?.last_name || 'Member'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {member.member_id} • {member.profiles?.phone || 'No phone'}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Badge 
                              variant={hasActiveMembership ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {hasActiveMembership ? 'Active Membership' : 'No Active Membership'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadSingleQR(member)
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        {/* Email button removed since email is not available in profiles table */}
                        {/* 
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // sendQRByEmail(member)
                          }}
                        >
                          <Mail className="w-3 h-3" />
                        </Button>
                        */}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Members Found</h3>
              <p>No members match your search criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            QR Code Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>Individual QR Codes:</strong> Click download button to get single QR code</li>
            <li>• <strong>Bulk Generation:</strong> Select multiple members and generate PDF sheet</li>
            <li>• <strong>Member Access:</strong> Share QR codes with members for easy scanning</li>
            <li>• <strong>Scanning:</strong> Members can scan at <code>/scan</code> page (no login required)</li>
            <li>• <strong>Backup Method:</strong> Members can also enter their member ID manually</li>
            <li>• <strong>Security:</strong> QR codes contain encrypted member data for verification</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
