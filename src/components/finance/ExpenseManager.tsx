import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Plus,
  Receipt,
  Search,
  Filter,
  Edit,
  Trash2,
  Upload,
  Download,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { ExpenseService, type CreateExpenseData } from '@/services/expenseService'

interface Expense {
  id: string
  category: string
  subcategory?: string
  description: string
  amount: number
  expense_date: string
  vendor_name?: string
  receipt_url?: string
  is_recurring: boolean
  recurrence_pattern?: any
  approved_by?: string
  created_by?: string
  created_at: string
  updated_at: string
}

const EXPENSE_CATEGORIES = [
  'equipment',
  'maintenance',
  'utilities',
  'staff',
  'marketing',
  'supplies',
  'rent',
  'insurance',
  'taxes',
  'supplements',
  'other'
]

export const ExpenseManager: React.FC = () => {
  const { gymId } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<CreateExpenseData>({
    gym_id: gymId || '',
    category: '',
    subcategory: '',
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    receipt_url: '',
    is_recurring: false,
    recurrence_pattern: null
  })
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    date_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (gymId) {
      loadExpenses()
    }
  }, [gymId, filters])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const data = await ExpenseService.getExpenses({
        gym_id: gymId!,
        category: filters.category === 'all' ? undefined : filters.category,
        date_from: filters.date_from,
        date_to: filters.date_to,
        search: filters.search || undefined
      })
      setExpenses(data)
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingExpense) {
        await ExpenseService.updateExpense(editingExpense.id, formData)
      } else {
        await ExpenseService.createExpense({
          ...formData,
          gym_id: gymId!
        })
      }
      
      resetForm()
      setIsAddDialogOpen(false)
      setEditingExpense(null)
      loadExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Error saving expense')
    }
  }

  const handleEdit = (expense: Expense) => {
    setFormData({
      gym_id: expense.id,
      category: expense.category,
      subcategory: expense.subcategory || '',
      description: expense.description,
      amount: expense.amount,
      expense_date: expense.expense_date,
      vendor_name: expense.vendor_name || '',
      receipt_url: expense.receipt_url || '',
      is_recurring: expense.is_recurring,
      recurrence_pattern: expense.recurrence_pattern
    })
    setEditingExpense(expense)
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await ExpenseService.deleteExpense(id)
        loadExpenses()
      } catch (error) {
        console.error('Error deleting expense:', error)
        alert('Error deleting expense')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      gym_id: gymId || '',
      category: '',
      subcategory: '',
      description: '',
      amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      receipt_url: '',
      is_recurring: false,
      recurrence_pattern: null
    })
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      equipment: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-orange-100 text-orange-800',
      utilities: 'bg-green-100 text-green-800',
      staff: 'bg-purple-100 text-purple-800',
      marketing: 'bg-pink-100 text-pink-800',
      supplies: 'bg-yellow-100 text-yellow-800',
      rent: 'bg-red-100 text-red-800',
      insurance: 'bg-indigo-100 text-indigo-800',
      taxes: 'bg-gray-100 text-gray-800',
      supplements: 'bg-teal-100 text-teal-800',
      other: 'bg-gray-100 text-gray-600'
    }
    return colors[category] || colors.other
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-red-600" />
            Expense Management
          </h2>
          <p className="text-muted-foreground">Track and manage gym expenses</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm()
              setEditingExpense(null)
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </DialogTitle>
              <DialogDescription>
                {editingExpense ? 'Update the expense details' : 'Record a new gym expense'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                    placeholder="Optional subcategory"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the expense"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="expense_date">Date *</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="vendor_name">Vendor/Supplier</Label>
                <Input
                  id="vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                  placeholder="Name of vendor or supplier"
                />
              </div>
              
              <div>
                <Label htmlFor="receipt_url">Receipt/Invoice URL</Label>
                <Input
                  id="receipt_url"
                  type="url"
                  value={formData.receipt_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, receipt_url: e.target.value }))}
                  placeholder="https://... (optional)"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="is_recurring">This is a recurring expense</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setEditingExpense(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Description, vendor..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date_from">From Date</Label>
              <Input
                id="date_from"
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="date_to">To Date</Label>
              <Input
                id="date_to"
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} expense(s) in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {expenses.length > 0 ? formatCurrency(totalExpenses / expenses.length) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average expense per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(expenses.map(e => e.category)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Different expense categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>
            {expenses.length} expense record(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading expenses...</div>
          ) : expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="font-medium">
                        {formatDate(new Date(expense.expense_date))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category}
                      </Badge>
                      {expense.subcategory && (
                        <div className="text-xs text-gray-500 mt-1">
                          {expense.subcategory}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="font-medium">{expense.description}</div>
                        {expense.is_recurring && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Recurring
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expense.vendor_name || (
                        <span className="text-gray-400">No vendor</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {expense.receipt_url ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                        )}
                        <span className="text-sm">
                          {expense.receipt_url ? 'Receipt attached' : 'No receipt'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(expense)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {expense.receipt_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(expense.receipt_url, '_blank')}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Expenses Found</h3>
              <p>No expenses found for the selected criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

