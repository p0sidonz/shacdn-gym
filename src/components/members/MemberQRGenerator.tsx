import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  QrCode, 
  Download, 
  Search,
  User,
  Printer,
  CheckCircle,
  RefreshCw,
  Users
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

export const MemberQRGenerator: React.FC = () => {
  const { gymId } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (gymId) {
      loadMembers()
    }
  }, [gymId])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm])

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

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(member => 
        member.profiles?.first_name?.toLowerCase().includes(searchLower) ||
        member.profiles?.last_name?.toLowerCase().includes(searchLower) ||
        member.member_id.toLowerCase().includes(searchLower) ||
        member.profiles?.phone?.includes(searchTerm)
      )
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

  const generatePrintableSheet = async () => {
    if (selectedMembers.length === 0) {
      alert('Please select at least one member')
      return
    }

    setGenerating(true)
    
    try {
      const selectedMemberData = filteredMembers.filter(m => selectedMembers.includes(m.id))
      
      // Generate QR codes for all selected members
      const memberQRCodes = await Promise.all(
        selectedMemberData.map(async (member) => {
          const qrData = generateQRData(member)
          const qrCode = await generateQRCode(qrData)
          return { member, qrCode }
        })
      )
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Member QR Codes - Attendance System</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .qr-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 25px; 
              margin-top: 20px;
            }
            .qr-item { 
              text-align: center; 
              padding: 20px; 
              border: 2px solid #333; 
              border-radius: 10px; 
              background: #f9f9f9;
              page-break-inside: avoid;
            }
            .qr-code { 
              width: 120px; 
              height: 120px; 
              margin: 0 auto 15px; 
              border: 1px solid #ccc;
            }
            .member-info { 
              font-size: 14px; 
            }
            .member-name { 
              font-weight: bold; 
              margin-bottom: 8px;
              font-size: 16px;
            }
            .member-id { 
              color: #666; 
              font-family: monospace;
              background: #eee;
              padding: 4px 8px;
              border-radius: 4px;
              margin-bottom: 5px;
              display: inline-block;
            }
            .member-phone {
              color: #555;
              font-size: 12px;
            }
            .instructions {
              margin-top: 30px;
              padding: 15px;
              background: #f0f0f0;
              border-radius: 5px;
              font-size: 12px;
            }
            @media print { 
              .no-print { display: none; }
              body { margin: 10px; }
              .qr-grid { gap: 15px; }
              .qr-item { padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Gym Member QR Codes</h1>
            <p>Attendance Check-in System</p>
          </div>
          
          <div class="no-print">
            <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total members:</strong> ${selectedMemberData.length}</p>
            <button onclick="window.print()" style="background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">🖨️ Print QR Codes</button>
            <button onclick="window.close()" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">✖️ Close</button>
          </div>
          
          <div class="qr-grid">
            ${memberQRCodes.map(({ member, qrCode }) => `
              <div class="qr-item">
                <div class="qr-code">
                  <img src="${qrCode}" alt="QR Code for ${member.profiles?.first_name || 'Member'}" style="width: 100%; height: 100%;" />
                </div>
                <div class="member-info">
                  <div class="member-name">${member.profiles?.first_name || 'Unknown'} ${member.profiles?.last_name || 'Member'}</div>
                  <div class="member-id">${member.member_id}</div>
                  <div class="member-phone">${member.profiles?.phone || 'No phone'}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="instructions no-print">
            <h3>📱 How to Use QR Codes:</h3>
            <ul>
              <li><strong>Members:</strong> Visit <code>/scan</code> page and scan your QR code</li>
              <li><strong>Manual Entry:</strong> Enter member ID if QR scanning fails</li>
              <li><strong>Check-in/Check-out:</strong> System automatically detects and processes</li>
              <li><strong>Auto-checkout:</strong> Members are auto-checked-out at 11:59 PM if forgotten</li>
            </ul>
          </div>
        </body>
        </html>
      `

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
            <QrCode className="w-6 h-6 text-blue-600" />
            Generate Member QR Codes
          </CardTitle>
          <CardDescription>
            Create QR codes for member attendance scanning. Members can use these to check-in/check-out at the gym.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
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
              
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={selectAllMembers}
                  disabled={filteredMembers.length === 0}
                >
                  <Users className="w-4 h-4 mr-2" />
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

            {/* Generate Action */}
            {selectedMembers.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      {selectedMembers.length} member(s) selected for QR generation
                    </span>
                  </div>
                  <Button
                    onClick={generatePrintableSheet}
                    disabled={generating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 mr-2" />
                        Generate & Print QR Sheet
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Select Members ({filteredMembers.length})</CardTitle>
          <CardDescription>
            Choose members to generate QR codes for attendance scanning
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const isSelected = selectedMembers.includes(member.id)
                const hasActiveMembership = member.memberships.some(m => m.status === 'active')
                
                return (
                  <div
                    key={member.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => toggleMemberSelection(member.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 border-2 rounded-md flex items-center justify-center ${
                          isSelected 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-white" fill="currentColor" />
                          )}
                        </div>
                        
                        <User className="w-10 h-10 text-gray-500 bg-gray-100 rounded-full p-2" />
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="font-medium text-lg">
                        {member.profiles?.first_name || 'Unknown'} {member.profiles?.last_name || 'Member'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="font-mono bg-gray-100 px-2 py-1 rounded text-xs inline-block">
                          {member.member_id}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        📞 {member.profiles?.phone || 'No phone'}
                      </div>
                      <div className="mt-2">
                        <Badge 
                          variant={hasActiveMembership ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {hasActiveMembership ? 'Active Member' : 'No Active Membership'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Members Found</h3>
              <p>No members match your search criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code Usage Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">📱 For Members:</h4>
              <ul className="space-y-1">
                <li>• Visit <code className="bg-green-100 px-1 rounded">/scan</code> page</li>
                <li>• Scan QR code with phone camera</li>
                <li>• Or enter member ID manually</li>
                <li>• System auto-detects check-in/check-out</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🏋️ For Gym Staff:</h4>
              <ul className="space-y-1">
                <li>• Print QR codes and distribute to members</li>
                <li>• Monitor attendance in dashboard</li>
                <li>• Auto-checkout runs at 11:59 PM</li>
                <li>• Track attendance analytics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
