import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useGym } from '@/hooks/useGym'
import { useAuth } from '@/context/AuthContext'
import type { OperatingHours } from '@/types'
import { Building2, MapPin, Phone, Clock, Loader2 } from 'lucide-react'

export default function GymSetup() {
  const { user } = useAuth()
  const { createGym, loading } = useGym(user?.id)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    facilities: '',
    amenities: ''
  })

  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    monday: { open: '06:00', close: '22:00', closed: false },
    tuesday: { open: '06:00', close: '22:00', closed: false },
    wednesday: { open: '06:00', close: '22:00', closed: false },
    thursday: { open: '06:00', close: '22:00', closed: false },
    friday: { open: '06:00', close: '22:00', closed: false },
    saturday: { open: '07:00', close: '21:00', closed: false },
    sunday: { open: '07:00', close: '20:00', closed: false }
  })

  const [submitLoading, setSubmitLoading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      setSubmitLoading(true)
      
      const gymData = {
        ...formData,
        operating_hours: operatingHours,
        facilities: formData.facilities.split(',').map(f => f.trim()).filter(f => f),
        amenities: formData.amenities.split(',').map(a => a.trim()).filter(a => a),
        policies: {
          cancellation_policy: 'Standard 30-day notice required for membership cancellation.',
          refund_policy: 'Refunds processed as per package terms and conditions.',
          transfer_policy: 'Membership transfers allowed with applicable fees.'
        }
      }

      const result = await createGym(gymData)
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Reload the page to show the dashboard
      window.location.reload()
    } catch (error) {
      console.error('Error creating gym:', error)
      alert('Failed to create gym. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Gym Management CRM!</CardTitle>
          <CardDescription className="text-lg">
            Let's set up your gym profile to get started. This information will be used throughout the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Gym Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., FitZone Gym"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+91-9999999999"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of your gym..."
                  rows={3}
                />
              </div>
            </div>

            {/* Location Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </h3>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Full address of your gym"
                  rows={2}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="e.g., Mumbai"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="e.g., Maharashtra"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    placeholder="400001"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="info@fitzonegym.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://www.fitzonegym.com"
                  />
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operating Hours
              </h3>
              <div className="space-y-3">
                {days.map(day => (
                  <div key={day} className="grid grid-cols-4 gap-4 items-center">
                    <div className="capitalize font-medium">{day}</div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={operatingHours[day].open}
                        onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                        disabled={operatingHours[day].closed}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={operatingHours[day].close}
                        onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                        disabled={operatingHours[day].closed}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`${day}-closed`}
                        checked={operatingHours[day].closed}
                        onChange={(e) => handleHoursChange(day, 'closed', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={`${day}-closed`} className="text-sm">Closed</Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Facilities & Amenities */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Facilities & Amenities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facilities">Facilities</Label>
                  <Textarea
                    id="facilities"
                    value={formData.facilities}
                    onChange={(e) => handleInputChange('facilities', e.target.value)}
                    placeholder="Cardio Equipment, Weight Training, Personal Training (comma separated)"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Separate each facility with a comma</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amenities">Amenities</Label>
                  <Textarea
                    id="amenities"
                    value={formData.amenities}
                    onChange={(e) => handleInputChange('amenities', e.target.value)}
                    placeholder="Locker Room, Shower, Parking, WiFi (comma separated)"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">Separate each amenity with a comma</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button 
                type="submit" 
                size="lg" 
                disabled={submitLoading || loading}
                className="min-w-48"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up your gym...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Create Gym Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
