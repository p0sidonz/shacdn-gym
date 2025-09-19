import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActivityLogService } from '@/services/activityLogService'
import { useAuth } from '@/context/AuthContext'
import { ChevronDown, ChevronUp, Filter, Search } from 'lucide-react'

interface ActivityLog {
  id: string
  gym_id: string
  actor_user_id: string | null
  actor_profile_id: string | null
  resource_type: string
  resource_id: string
  action: string
  description: string | null
  before_data: any
  after_data: any
  created_at: string
}

export default function ActivityLogs() {
  const { gymId } = useAuth()

  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<ActivityLog[]>([])

  // Filters
  const [resourceType, setResourceType] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [actorUserId, setActorUserId] = useState<string>('')
  const [resourceId, setResourceId] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('this_week')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const computedRange = useMemo(() => {
    const now = new Date()
    const startOfWeek = (d: Date) => {
      const date = new Date(d)
      const day = date.getDay()
      const diff = (day === 0 ? -6 : 1) - day
      date.setDate(date.getDate() + diff)
      date.setHours(0,0,0,0)
      return date
    }
    const endOfWeek = (d: Date) => {
      const s = startOfWeek(d)
      const e = new Date(s)
      e.setDate(s.getDate() + 6)
      e.setHours(23,59,59,999)
      return e
    }
    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
    const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23,59,59,999)

    if (dateFilter === 'all') return { from: undefined as string | undefined, to: undefined as string | undefined }
    if (dateFilter === 'today') {
      const s = new Date(now); s.setHours(0,0,0,0)
      const e = new Date(now); e.setHours(23,59,59,999)
      return { from: s.toISOString(), to: e.toISOString() }
    }
    if (dateFilter === 'this_week') {
      const s = startOfWeek(now)
      const e = endOfWeek(now)
      return { from: s.toISOString(), to: e.toISOString() }
    }
    if (dateFilter === 'this_month') {
      const s = startOfMonth(now)
      const e = endOfMonth(now)
      return { from: s.toISOString(), to: e.toISOString() }
    }
    if (dateFilter === 'last_month') {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const s = startOfMonth(last)
      const e = endOfMonth(last)
      return { from: s.toISOString(), to: e.toISOString() }
    }
    if (dateFilter === 'custom') {
      const fromIso = customStartDate ? new Date(customStartDate + 'T00:00:00').toISOString() : undefined
      const toIso = customEndDate ? new Date(customEndDate + 'T23:59:59').toISOString() : undefined
      return { from: fromIso, to: toIso }
    }
    return { from: undefined, to: undefined }
  }, [dateFilter, customStartDate, customEndDate])

  const fetchLogs = async () => {
    if (!gymId) return
    try {
      setLoading(true)
      const data = await ActivityLogService.fetchLogs({
        gym_id: gymId,
        resource_type: resourceType !== 'all' ? resourceType : undefined,
        resource_id: resourceId || undefined,
        actor_user_id: actorUserId || undefined,
        from: computedRange.from,
        to: computedRange.to,
        limit: 200,
      })
      const filtered = actionFilter === 'all' ? data : data.filter((d: any) => d.action === actionFilter)
      setLogs(filtered as ActivityLog[])
    } catch (e) {
      console.error('Failed to fetch logs', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Logs</h1>
          <p className="text-muted-foreground">Full audit trail for your gym. Filters apply client-side; RLS enforces gym scope.</p>
        </div>
        <Button onClick={fetchLogs} disabled={loading}>
          <Filter className="w-4 h-4 mr-2" /> Apply Filters
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Limit results by resource, action, actor, and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-1">
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="inquiries">inquiries</SelectItem>
                  <SelectItem value="members">members</SelectItem>
                  <SelectItem value="memberships">memberships</SelectItem>
                  <SelectItem value="payments">payments</SelectItem>
                  <SelectItem value="profiles">profiles</SelectItem>
                  <SelectItem value="inquiry_followups">inquiry_followups</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">create</SelectItem>
                  <SelectItem value="update">update</SelectItem>
                  <SelectItem value="status_change">status_change</SelectItem>
                  <SelectItem value="delete">delete</SelectItem>
                  <SelectItem value="assign">assign</SelectItem>
                  <SelectItem value="unassign">unassign</SelectItem>
                  <SelectItem value="payment">payment</SelectItem>
                  <SelectItem value="refund">refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Input placeholder="Actor user_id" value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <Input placeholder="Resource ID" value={resourceId} onChange={(e) => setResourceId(e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex items-center space-x-2">
              {dateFilter === 'custom' && (
                <>
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>
            Showing {logs.length} record{logs.length === 1 ? '' : 's'} {loading && '(loading...)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <>
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.resource_type}</div>
                      <div className="text-xs text-muted-foreground">{log.resource_id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.action === 'delete' ? 'destructive' : log.action === 'status_change' ? 'secondary' : 'outline'}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.actor_user_id || '-'}</TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">{log.description || '-'}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => toggleRow(log.id)}>
                        {expanded[log.id] ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />} View
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expanded[log.id] && (
                    <TableRow key={log.id + '-details'}>
                      <TableCell colSpan={6}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-muted/50 p-3 rounded">
                            <div className="text-xs font-medium mb-1">Before</div>
                            <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">{JSON.stringify(log.before_data, null, 2)}</pre>
                          </div>
                          <div className="bg-muted/50 p-3 rounded">
                            <div className="text-xs font-medium mb-1">After</div>
                            <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">{JSON.stringify(log.after_data, null, 2)}</pre>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {logs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No logs found for selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
