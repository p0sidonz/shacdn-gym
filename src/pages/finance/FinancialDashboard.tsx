import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Plus,
  PieChart,
  BarChart3,
  Users,
  ShoppingCart,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { IncomeService, type IncomeStats } from '@/services/incomeService'
import { ExpenseService } from '@/services/expenseService'
import { ExpenseManager } from '@/components/finance/ExpenseManager'

interface FinancialOverview {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  incomeGrowth: number
  expenseGrowth: number
}

export default function FinancialDashboard() {
  const { gymId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Financial data
  const [overview, setOverview] = useState<FinancialOverview | null>(null)
  const [incomeStats, setIncomeStats] = useState<IncomeStats | null>(null)
  const [expenseSummary, setExpenseSummary] = useState<Record<string, number>>({})
  const [monthlyData, setMonthlyData] = useState<Array<{month: string; income: number; expenses: number}>>([])
  
  // Filters
  const [dateFilter, setDateFilter] = useState('this_month')
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (gymId) {
      loadFinancialData()
    }
  }, [gymId, dateFrom, dateTo])

  useEffect(() => {
    updateDateRange()
  }, [dateFilter])

  const updateDateRange = () => {
    const today = new Date()
    let from: Date
    let to: Date = today

    switch (dateFilter) {
      case 'today':
        from = today
        break
      case 'yesterday':
        from = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        to = from
        break
      case 'this_week':
        from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'this_month':
        from = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'last_month':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        to = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      case 'this_quarter':
        const quarter = Math.floor(today.getMonth() / 3)
        from = new Date(today.getFullYear(), quarter * 3, 1)
        break
      case 'this_year':
        from = new Date(today.getFullYear(), 0, 1)
        break
      default:
        return // Custom date range, don't update
    }

    setDateFrom(from.toISOString().split('T')[0])
    setDateTo(to.toISOString().split('T')[0])
  }

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      
      await Promise.all([
        loadIncomeData(),
        loadExpenseData(),
        loadMonthlyComparison(),
        loadOverview()
      ])
    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadFinancialData()
    setRefreshing(false)
  }

  const loadIncomeData = async () => {
    try {
      const stats = await IncomeService.getIncomeStats(gymId!, dateFrom, dateTo)
      setIncomeStats(stats)
    } catch (error) {
      console.error('Error loading income data:', error)
    }
  }

  const loadExpenseData = async () => {
    try {
      const summary = await ExpenseService.getExpenseSummary(gymId!, dateFrom, dateTo)
      setExpenseSummary(summary)
    } catch (error) {
      console.error('Error loading expense data:', error)
    }
  }

  const loadMonthlyComparison = async () => {
    try {
      const incomeData = await IncomeService.getMonthlyIncomeComparison(gymId!, 6)
      
      // Get monthly expenses for the same period
      const monthsAgo = new Date()
      monthsAgo.setMonth(monthsAgo.getMonth() - 6)
      
      const expenses = await ExpenseService.getExpenses({
        gym_id: gymId!,
        date_from: monthsAgo.toISOString().split('T')[0]
      })

      // Group expenses by month
      const monthlyExpenses = expenses.reduce((acc, expense) => {
        const date = new Date(expense.expense_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!acc[monthKey]) {
          acc[monthKey] = 0
        }
        acc[monthKey] += parseFloat(expense.amount)
        
        return acc
      }, {} as Record<string, number>)

      // Combine income and expense data
      const combined = incomeData.map(item => ({
        month: item.month,
        income: item.amount,
        expenses: monthlyExpenses[item.month] || 0
      }))

      setMonthlyData(combined)
    } catch (error) {
      console.error('Error loading monthly comparison:', error)
    }
  }

  const loadOverview = async () => {
    try {
      const totalExpenses = await ExpenseService.getTotalExpenses(gymId!, dateFrom, dateTo)
      const totalIncome = incomeStats?.totalIncome || 0
      
      const netProfit = totalIncome - totalExpenses
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

      // Calculate growth rates (simplified - comparing with previous period)
      const incomeGrowthData = await IncomeService.getIncomeGrowthRate(gymId!, dateFrom, dateTo)
      
      setOverview({
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
        incomeGrowth: incomeGrowthData.growthRate,
        expenseGrowth: 0 // Simplified for now
      })
    } catch (error) {
      console.error('Error loading overview:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading financial data...</p>
        </div>
      </div>
    )
  }

  const totalExpenses = Object.values(expenseSummary).reduce((sum, amount) => sum + amount, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Financial Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track income, expenses, and profitability
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="dateFilter">Quick Filter</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateFilter === 'custom' && (
              <>
                <div>
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(incomeStats?.totalIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.incomeGrowth !== undefined && (
                <span className={overview.incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {overview.incomeGrowth >= 0 ? '+' : ''}{overview.incomeGrowth.toFixed(1)}% from previous period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {Object.keys(expenseSummary).length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            {overview && overview.netProfit >= 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overview && overview.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(overview?.netProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.profitMargin !== undefined && `${overview.profitMargin.toFixed(1)}% profit margin`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily Income</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {incomeStats?.dailyIncome.length ? 
                formatCurrency(incomeStats.totalIncome / incomeStats.dailyIncome.length) :
                formatCurrency(0)
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {incomeStats?.dailyIncome.length || 0} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income Analysis</TabsTrigger>
          <TabsTrigger value="expenses">Expense Tracking</TabsTrigger>
          <TabsTrigger value="expense-manager">Manage Expenses</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Monthly Trend (Last 6 Months)
                </CardTitle>
                <CardDescription>Income vs Expenses comparison</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <div className="space-y-4">
                    {monthlyData.slice(-6).map((item, index) => {
                      const profit = item.income - item.expenses
                      const profitPercentage = item.income > 0 ? (profit / item.income) * 100 : 0
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{item.month}</span>
                            <span className={`text-sm font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(profit)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Income: {formatCurrency(item.income)}</span>
                              <span>Expenses: {formatCurrency(item.expenses)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${Math.min(100, (item.income / Math.max(item.income, item.expenses, 1)) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No data available for monthly trend</p>
                )}
              </CardContent>
            </Card>

            {/* Income Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Income Breakdown
                </CardTitle>
                <CardDescription>Income by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                {incomeStats?.categoryBreakdown && Object.keys(incomeStats.categoryBreakdown).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(incomeStats.categoryBreakdown).map(([category, amount], index) => {
                      const percentage = incomeStats.totalIncome > 0 ? (amount / incomeStats.totalIncome) * 100 : 0
                      
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium capitalize">
                              {category.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-semibold text-green-600">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">{percentage.toFixed(1)}% of total income</p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No income data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Paying Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top Paying Members
              </CardTitle>
              <CardDescription>Members contributing most to revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {incomeStats?.topPayingMembers && incomeStats.topPayingMembers.length > 0 ? (
                <div className="space-y-3">
                  {incomeStats.topPayingMembers.slice(0, 5).map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-green-600">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{member.member_name}</div>
                          <div className="text-sm text-gray-500">ID: {member.member_id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(member.total_paid)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.payment_count} payments
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No payment data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Income Details</CardTitle>
              <CardDescription>Detailed income analysis and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Membership Revenue</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(incomeStats?.membershipIncome || 0)}
                  </p>
                  <p className="text-sm text-gray-500">From membership fees</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Personal Training</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(incomeStats?.ptIncome || 0)}
                  </p>
                  <p className="text-sm text-gray-500">From PT sessions</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Additional Services</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(incomeStats?.addonIncome || 0)}
                  </p>
                  <p className="text-sm text-gray-500">From addon services</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Expense Breakdown
              </CardTitle>
              <CardDescription>Expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(expenseSummary).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(expenseSummary).map(([category, amount], index) => {
                    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                    
                    return (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium capitalize">{category.replace('_', ' ')}</h3>
                          <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                        </div>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(amount)}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No expense data available for this period</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense-manager" className="space-y-6">
          <ExpenseManager />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>Generate and download financial reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Profit & Loss Statement</h3>
                  <div className="space-y-2 p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <span>Total Income:</span>
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(incomeStats?.totalIncome || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Expenses:</span>
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(totalExpenses)}
                      </span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Net Profit:</span>
                      <span className={overview && overview.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(overview?.netProfit || 0)}
                      </span>
                    </div>
                  </div>
                  <Button className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download P&L Report
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">Summary Statistics</h3>
                  <div className="space-y-2 p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <span>Revenue per Member:</span>
                      <span className="font-semibold">
                        {incomeStats?.topPayingMembers.length ? 
                          formatCurrency(incomeStats.totalIncome / incomeStats.topPayingMembers.length) :
                          formatCurrency(0)
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Daily Income:</span>
                      <span className="font-semibold">
                        {incomeStats?.dailyIncome.length ? 
                          formatCurrency(incomeStats.totalIncome / incomeStats.dailyIncome.length) :
                          formatCurrency(0)
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Margin:</span>
                      <span className="font-semibold">
                        {overview?.profitMargin.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Detailed Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
