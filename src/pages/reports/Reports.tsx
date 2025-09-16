import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Download } from 'lucide-react'

const Reports = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Financial reports, member analytics, and business insights</p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Analytics Dashboard
          </CardTitle>
          <CardDescription>
            This page will contain reports and analytics functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Reports and analytics features coming soon. This will include:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
            <li>Revenue and profit/loss reports</li>
            <li>Member growth and retention analytics</li>
            <li>Trainer performance metrics</li>
            <li>Payment collection reports</li>
            <li>Attendance trend analysis</li>
            <li>Custom date range reports</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports
