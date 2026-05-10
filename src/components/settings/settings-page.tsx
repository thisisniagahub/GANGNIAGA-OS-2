'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Settings,
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Palette,
  Users,
  Globe,
  Zap,
  ExternalLink,
  Plus,
  CheckCircle,
  Key,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Mail,
  Download,
  Clock,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/lib/stores/auth-store'

// --- Types ---
interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  status: 'active' | 'pending'
}

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ElementType
  connected: boolean
  category: string
}

// --- Mock Data ---
const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex@company.com', role: 'owner', status: 'active' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@company.com', role: 'admin', status: 'active' },
  { id: '3', name: 'Mike Rodriguez', email: 'mike@company.com', role: 'editor', status: 'active' },
  { id: '4', name: 'Emily Park', email: 'emily@company.com', role: 'viewer', status: 'pending' },
  { id: '5', name: 'David Kim', email: 'david@company.com', role: 'editor', status: 'active' },
]

const mockIntegrations: Integration[] = [
  { id: '1', name: 'QuickBooks', description: 'Sync financial data and invoices', icon: CreditCard, connected: true, category: 'Accounting' },
  { id: '2', name: 'Xero', description: 'Cloud accounting integration', icon: CreditCard, connected: false, category: 'Accounting' },
  { id: '3', name: 'Stripe', description: 'Payment processing and revenue data', icon: Zap, connected: true, category: 'Payments' },
  { id: '4', name: 'Google Analytics', description: 'Web analytics and traffic data', icon: Globe, connected: false, category: 'Analytics' },
  { id: '5', name: 'Slack', description: 'Team notifications and alerts', icon: Bell, connected: true, category: 'Communication' },
  { id: '6', name: 'Discord', description: 'Community and team communication', icon: Users, connected: false, category: 'Communication' },
]

const roleColors: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400',
  editor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
  viewer: 'bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400',
}

// --- Sub-Components ---
function ProfileSection() {
  const { user, setUser } = useAuthStore()
  const [name, setName] = useState(user?.name || 'Alex Johnson')
  const [email, setEmail] = useState(user?.email || 'alex@company.com')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSaveProfile = () => {
    setSaving(true)
    setTimeout(() => {
      if (user) {
        setUser({ ...user, name, email })
      }
      setSaving(false)
      toast.success('Profile updated successfully!')
    }, 500)
  }

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    setTimeout(() => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaving(false)
      toast.success('Password changed successfully!')
    }, 500)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Profile</CardTitle>
        </div>
        <CardDescription>Manage your personal information and password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar + Basic Info */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            <Button variant="outline" size="sm" className="h-7 text-xs mt-1">
              Change Avatar
            </Button>
          </div>
        </div>

        <Separator />

        {/* Name and Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full Name</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
          Save Profile
        </Button>

        <Separator />

        {/* Change Password */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            Change Password
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current-pw">Current Password</Label>
              <Input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">New Password</Label>
              <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm Password</Label>
              <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleChangePassword} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Key className="w-4 h-4 mr-1" />}
            Update Password
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function OrganizationSection() {
  const { organization, setOrganization } = useAuthStore()
  const [orgName, setOrgName] = useState(organization?.name || 'GangNiaga Corp')
  const [industry, setIndustry] = useState(organization?.industry || 'technology')
  const [companySize, setCompanySize] = useState(organization?.size || '11-50')
  const [country, setCountry] = useState('US')
  const [currency, setCurrency] = useState(organization?.currency || 'USD')
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      if (organization) {
        setOrganization({
          ...organization,
          name: orgName,
          industry,
          size: companySize,
          currency,
        })
      }
      setSaving(false)
      toast.success('Organization settings updated!')
    }, 500)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Organization</CardTitle>
        </div>
        <CardDescription>Manage your company details and preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="finance">Finance & Banking</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="retail">Retail & E-commerce</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="realestate">Real Estate</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Company Size</Label>
            <Select value={companySize} onValueChange={setCompanySize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10 employees</SelectItem>
                <SelectItem value="11-50">11-50 employees</SelectItem>
                <SelectItem value="51-200">51-200 employees</SelectItem>
                <SelectItem value="201-500">201-500 employees</SelectItem>
                <SelectItem value="501-1000">501-1,000 employees</SelectItem>
                <SelectItem value="1000+">1,000+ employees</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="SG">Singapore</SelectItem>
                <SelectItem value="MY">Malaysia</SelectItem>
                <SelectItem value="ID">Indonesia</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
                <SelectItem value="JP">Japan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (&euro;)</SelectItem>
                <SelectItem value="GBP">GBP (&pound;)</SelectItem>
                <SelectItem value="SGD">SGD (S$)</SelectItem>
                <SelectItem value="MYR">MYR (RM)</SelectItem>
                <SelectItem value="IDR">IDR (Rp)</SelectItem>
                <SelectItem value="JPY">JPY (&yen;)</SelectItem>
                <SelectItem value="AUD">AUD (A$)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
          Save Organization
        </Button>
      </CardContent>
    </Card>
  )
}

function TeamMembersSection() {
  const [members, setMembers] = useState(mockTeamMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteOpen, setInviteOpen] = useState(false)

  const handleInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    const newMember: TeamMember = {
      id: String(Date.now()),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole as TeamMember['role'],
      status: 'pending',
    }
    setMembers((prev) => [...prev, newMember])
    setInviteEmail('')
    setInviteOpen(false)
    toast.success(`Invitation sent to ${inviteEmail}`)
  }

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    toast.success('Team member removed')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Team Members</CardTitle>
            </div>
            <CardDescription>Manage your team and invitations</CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleInvite}>
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {member.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{member.name}</span>
                  {member.status === 'pending' && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 capitalize ${roleColors[member.role]}`}>
                {member.role}
              </Badge>
              {member.role !== 'owner' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <span className="text-xs text-muted-foreground hover:text-destructive">&times;</span>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function BillingSection() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Billing & Plan</CardTitle>
        </div>
        <CardDescription>Manage your subscription and usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Plan */}
        <div className="p-4 rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">Pro Plan</h4>
                <Badge className="text-[10px] px-1.5 py-0">Active</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">$49/month &middot; Billed monthly</p>
            </div>
            <Button variant="outline" size="sm" className="h-8">
              Upgrade to Enterprise
            </Button>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'AI Credits', used: '847', total: '2,000', pct: 42 },
            { label: 'Reports', used: '12', total: '50', pct: 24 },
            { label: 'Agents', used: '4', total: '10', pct: 40 },
            { label: 'Team Seats', used: '5', total: '10', pct: 50 },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-lg border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className="text-sm font-bold mt-0.5">{stat.used}<span className="text-xs font-normal text-muted-foreground">/{stat.total}</span></p>
              <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${stat.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">
            <Download className="w-3.5 h-3.5 mr-1" />
            Download Invoice
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            View Billing History
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function IntegrationsSection() {
  const [integrations, setIntegrations] = useState(mockIntegrations)

  const handleToggle = (id: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id ? { ...int, connected: !int.connected } : int
      )
    )
    const integration = integrations.find((i) => i.id === id)
    if (integration) {
      toast.success(
        integration.connected
          ? `${integration.name} disconnected`
          : `${integration.name} connected successfully!`
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Integrations</CardTitle>
        </div>
        <CardDescription>Connect third-party tools and services</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrations.map((integration) => {
            const IntegrationIcon = integration.icon
            return (
              <div
                key={integration.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
                  <IntegrationIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{integration.name}</p>
                    {integration.connected && (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{integration.description}</p>
                  <Button
                    variant={integration.connected ? 'outline' : 'default'}
                    size="sm"
                    className="h-6 text-[10px] mt-2"
                    onClick={() => handleToggle(integration.id)}
                  >
                    {integration.connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function NotificationsSection() {
  const [notifications, setNotifications] = useState({
    emailReportReady: true,
    emailAgentComplete: true,
    emailWeeklyDigest: false,
    emailRevenueAlert: true,
    inAppReportReady: true,
    inAppAgentComplete: true,
    inAppWorkflowError: true,
    inAppMentions: false,
    pushRevenueAlert: true,
    pushWorkflowError: true,
    pushAgentComplete: false,
  })

  const toggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const notificationGroups = [
    {
      title: 'Email Notifications',
      icon: Mail,
      items: [
        { key: 'emailReportReady' as const, label: 'Report Ready', desc: 'When a report finishes generating' },
        { key: 'emailAgentComplete' as const, label: 'Agent Task Complete', desc: 'When an AI agent completes a task' },
        { key: 'emailWeeklyDigest' as const, label: 'Weekly Digest', desc: 'Summary of weekly business activity' },
        { key: 'emailRevenueAlert' as const, label: 'Revenue Alerts', desc: 'When revenue hits or misses targets' },
      ],
    },
    {
      title: 'In-App Notifications',
      icon: Smartphone,
      items: [
        { key: 'inAppReportReady' as const, label: 'Report Ready', desc: 'When a report finishes generating' },
        { key: 'inAppAgentComplete' as const, label: 'Agent Task Complete', desc: 'When an AI agent completes a task' },
        { key: 'inAppWorkflowError' as const, label: 'Workflow Errors', desc: 'When a workflow fails or encounters errors' },
        { key: 'inAppMentions' as const, label: 'Mentions', desc: 'When someone mentions you in comments' },
      ],
    },
    {
      title: 'Push Notifications',
      icon: Bell,
      items: [
        { key: 'pushRevenueAlert' as const, label: 'Revenue Alerts', desc: 'Critical revenue threshold alerts' },
        { key: 'pushWorkflowError' as const, label: 'Workflow Errors', desc: 'When a workflow fails' },
        { key: 'pushAgentComplete' as const, label: 'Agent Task Complete', desc: 'When an AI agent completes a task' },
      ],
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Notifications</CardTitle>
        </div>
        <CardDescription>Configure how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationGroups.map((group) => {
          const GroupIcon = group.icon
          return (
            <div key={group.title}>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <GroupIcon className="w-4 h-4 text-muted-foreground" />
                {group.title}
              </h4>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={() => toggle(item.key)}
                    />
                  </div>
                ))}
              </div>
              <Separator className="mt-4" />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function SecuritySection() {
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [sessions] = useState([
    { device: 'Chrome on macOS', location: 'San Francisco, US', lastActive: 'Now', current: true },
    { device: 'Safari on iPhone', location: 'San Francisco, US', lastActive: '2 hours ago', current: false },
    { device: 'Firefox on Windows', location: 'New York, US', lastActive: '1 day ago', current: false },
  ])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Security</CardTitle>
        </div>
        <CardDescription>Manage your account security settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* MFA */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Multi-Factor Authentication</p>
              <p className="text-[11px] text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
          </div>
          <Switch checked={mfaEnabled} onCheckedChange={(v) => { setMfaEnabled(v); toast.success(v ? 'MFA enabled' : 'MFA disabled') }} />
        </div>

        {/* Session Management */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            Active Sessions
          </h4>
          <div className="space-y-2">
            {sessions.map((session, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{session.device}</p>
                      {session.current && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{session.location} &middot; {session.lastActive}</p>
                  </div>
                </div>
                {!session.current && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Audit Log */}
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Audit Log</p>
              <p className="text-[11px] text-muted-foreground">View recent account activity and changes</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  )
}

function ThemeSection() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Appearance</CardTitle>
        </div>
        <CardDescription>Customize the look and feel of the application</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const ThemeIcon = t.icon
            const isActive = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-transparent hover:border-muted-foreground/20 bg-muted/30'
                }`}
              >
                <ThemeIcon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// --- Main Component ---
export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Settings
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your account, organization, and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <nav className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {sections.map((section) => {
              const SectionIcon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <SectionIcon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{section.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && <ProfileSection />}
          {activeSection === 'organization' && <OrganizationSection />}
          {activeSection === 'team' && <TeamMembersSection />}
          {activeSection === 'billing' && <BillingSection />}
          {activeSection === 'integrations' && <IntegrationsSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'security' && <SecuritySection />}
          {activeSection === 'appearance' && <ThemeSection />}
        </div>
      </div>
    </div>
  )
}
