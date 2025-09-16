import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon, Save } from 'lucide-react'

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure gym settings, packages, and policies</p>
        </div>
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" />
            Gym Configuration
          </CardTitle>
          <CardDescription>
            This page will contain gym settings and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Settings features coming soon. This will include:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
            <li>Gym information and branding</li>
            <li>Membership packages and pricing</li>
            <li>Trainer commission rules</li>
            <li>Payment and refund policies</li>
            <li>Notification templates</li>
            <li>Operating hours and holidays</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
