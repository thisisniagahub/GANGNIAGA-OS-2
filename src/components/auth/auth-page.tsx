'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Brain,
  Bot,
  TrendingUp,
  BarChart3,
  Shield,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

/* ──────────────────────── Animation helpers ──────────────────────── */

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

/* ──────────────────────── Floating blob component ──────────────────────── */

function FloatingBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Large top-right blob */}
      <div
        className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.6) 0%, rgba(20,184,166,0.3) 50%, transparent 70%)',
          animation: 'floatBlob1 18s ease-in-out infinite',
        }}
      />
      {/* Medium bottom-left blob */}
      <div
        className="absolute -bottom-16 -left-16 h-[340px] w-[340px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(45,212,191,0.5) 0%, rgba(16,185,129,0.2) 60%, transparent 75%)',
          animation: 'floatBlob2 22s ease-in-out infinite',
        }}
      />
      {/* Small centre blob */}
      <div
        className="absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(52,211,153,0.5) 0%, transparent 70%)',
          animation: 'floatBlob3 15s ease-in-out infinite',
        }}
      />
      {/* Tiny accent circle */}
      <div
        className="absolute right-[15%] top-[60%] h-[100px] w-[100px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(167,243,208,0.6) 0%, transparent 70%)',
          animation: 'floatBlob4 12s ease-in-out infinite',
        }}
      />

      {/* CSS keyframes injected via style tag */}
      <style>{`
        @keyframes floatBlob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 40px) scale(1.05); }
          66% { transform: translate(20px, -20px) scale(0.95); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.96); }
        }
        @keyframes floatBlob3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes floatBlob4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, -30px) scale(1.1); }
        }
      `}</style>
    </div>
  )
}

/* ──────────────────────── Feature card sub-component ──────────────────────── */

function FeatureItem({ icon: Icon, title, description, index }: { icon: React.ElementType; title: string; description: string; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={fadeSlideUp}
      className="flex items-start gap-3 rounded-lg bg-white/10 p-3 backdrop-blur-sm transition-colors hover:bg-white/15"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
        <Icon className="h-4 w-4 text-emerald-100" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs leading-relaxed text-emerald-200/80">{description}</p>
      </div>
    </motion.div>
  )
}

/* ──────────────────────── Password toggle helper ──────────────────────── */

function PasswordInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  minLength,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  minLength?: number
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-10"
          required
          minLength={minLength}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

/* ──────────────────────── Main AuthPage ──────────────────────── */

export function AuthPage() {
  const { login, register, isLoading, loginAsGuest } = useAuthStore()

  /* Login state */
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  /* Register state */
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')

  /* ── Handlers ── */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields')
      return
    }
    try {
      await login(loginEmail, loginPassword)
      toast.success('Welcome back!')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerName || !registerEmail || !registerPassword || !registerConfirmPassword) {
      toast.error('Please fill in all fields')
      return
    }
    if (registerPassword !== registerConfirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (registerPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    try {
      await register(registerName, registerEmail, registerPassword)
      toast.success('Welcome to GangNiaga!')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
    }
  }

  /* ── Features data ── */

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Business Intelligence',
      description: 'Transform raw data into actionable insights with autonomous AI agents.',
    },
    {
      icon: Bot,
      title: 'Autonomous Agent System',
      description: 'Deploy intelligent agents that execute tasks and decisions autonomously.',
    },
    {
      icon: TrendingUp,
      title: 'Financial Forecasting & Planning',
      description: 'Predict cash flow, revenue, and expenses with machine-learning precision.',
    },
    {
      icon: BarChart3,
      title: 'Real-time Plan vs Actuals',
      description: 'Track budget performance live and receive instant variance alerts.',
    },
  ]

  /* ── Render ── */

  return (
    <div className="relative flex min-h-screen">
      {/* ──────────── LEFT: Branded panel (hidden on mobile) ──────────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative hidden w-[52%] flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 p-10 lg:flex"
      >
        {/* Floating blobs */}
        <FloatingBlobs />

        {/* Decorative grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top: Logo + Tagline */}
        <div className="relative z-10">
          <motion.div custom={0} variants={fadeSlideUp} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg ring-1 ring-white/10">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-white">GangNiaga</span>
              <span className="ml-2 text-sm font-medium text-emerald-200">AI</span>
            </div>
          </motion.div>

          <motion.div custom={1} variants={fadeSlideUp} className="mt-8 max-w-md">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              The AI Operating System for{' '}
              <span className="bg-gradient-to-r from-emerald-200 to-teal-200 bg-clip-text text-transparent">
                Startups &amp; SMEs
              </span>
            </h1>
            <p className="mt-3 text-base leading-relaxed text-emerald-100/80">
              Unify your business intelligence, financial planning, and autonomous operations in one
              intelligent platform.
            </p>
          </motion.div>
        </div>

        {/* Middle: Feature highlights */}
        <motion.div variants={stagger} className="relative z-10 my-8 grid gap-3">
          {features.map((f, i) => (
            <FeatureItem key={f.title} icon={f.icon} title={f.title} description={f.description} index={i + 2} />
          ))}
        </motion.div>

        {/* Bottom: Trust badges */}
        <motion.div custom={6} variants={fadeSlideUp} className="relative z-10 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-emerald-200/70">
            <Shield className="h-3.5 w-3.5" />
            <span>Enterprise-grade Security</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-200/70">
            <Zap className="h-3.5 w-3.5" />
            <span>99.9% Uptime</span>
          </div>
          <Badge className="border-white/20 bg-white/10 text-emerald-100 backdrop-blur-sm hover:bg-white/15">
            v2.0
          </Badge>
        </motion.div>
      </motion.div>

      {/* ──────────── RIGHT: Auth forms ──────────── */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-background px-4 py-8 sm:px-8">
        {/* Mobile-only branded header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mb-8 flex flex-col items-center lg:hidden"
        >
          <motion.div custom={0} variants={fadeSlideUp} className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">GangNiaga AI</span>
          </motion.div>
          <motion.p custom={1} variants={fadeSlideUp} className="mt-2 text-center text-sm text-muted-foreground">
            The AI Operating System for Startups &amp; SMEs
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="w-full max-w-[420px]"
        >
          {/* Desktop header */}
          <motion.div custom={2} variants={fadeSlideUp} className="mb-6 hidden lg:block">
            <h2 className="text-2xl font-bold tracking-tight">Welcome</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your account or create a new one to get started.
            </p>
          </motion.div>

          <motion.div custom={3} variants={fadeSlideUp}>
            <Card className="border-0 bg-card/80 shadow-xl backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Get Started</CardTitle>
                <CardDescription>Choose your preferred method to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" className="text-sm">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="register" className="text-sm">
                      Create Account
                    </TabsTrigger>
                  </TabsList>

                  {/* ─── Login ─── */}
                  <TabsContent value="login">
                    <motion.form
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      onSubmit={handleLogin}
                      className="mt-4 space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-sm font-medium">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@company.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="pl-9"
                            required
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <PasswordInput
                        id="login-password"
                        label="Password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={setLoginPassword}
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="remember"
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked === true)}
                          />
                          <Label htmlFor="remember" className="cursor-pointer text-xs text-muted-foreground">
                            Remember me
                          </Label>
                        </div>
                        <button
                          type="button"
                          className="text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                          onClick={() => toast.info('Password reset coming soon')}
                        >
                          Forgot password?
                        </button>
                      </div>

                      <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        Sign In
                      </Button>
                    </motion.form>
                  </TabsContent>

                  {/* ─── Register ─── */}
                  <TabsContent value="register">
                    <motion.form
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      onSubmit={handleRegister}
                      className="mt-4 space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="register-name" className="text-sm font-medium">
                          Full Name
                        </Label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="register-name"
                            type="text"
                            placeholder="John Doe"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            className="pl-9"
                            required
                            autoComplete="name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-sm font-medium">
                          Email
                        </Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="you@company.com"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            className="pl-9"
                            required
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <PasswordInput
                        id="register-password"
                        label="Password"
                        placeholder="Min 6 characters"
                        value={registerPassword}
                        onChange={setRegisterPassword}
                        minLength={6}
                      />

                      <PasswordInput
                        id="register-confirm-password"
                        label="Confirm Password"
                        placeholder="Re-enter your password"
                        value={registerConfirmPassword}
                        onChange={setRegisterConfirmPassword}
                        minLength={6}
                      />

                      <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Create Account
                      </Button>
                    </motion.form>
                  </TabsContent>
                </Tabs>

                {/* Demo / Guest Mode */}
                <div className="mt-6 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
                    size="lg"
                    onClick={loginAsGuest}
                    disabled={isLoading}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Try Demo — No Sign Up Required
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Explore all features with sample data. Or sign up to save your progress.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.p
            custom={4}
            variants={fadeIn}
            className="mt-6 text-center text-xs text-muted-foreground"
          >
            GangNiaga AI OS v2.0 — The AI Operating System for Startups &amp; SMEs
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
