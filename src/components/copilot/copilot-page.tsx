'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Send,
  Loader2,
  Plus,
  Bot,
  MessageSquare,
  Sparkles,
  Brain,
  TrendingUp,
  Search,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO string for serialization
}

interface ChatSession {
  id: string
  title: string
  agentType: string
  createdAt: string // ISO string for serialization
  messages: ChatMessage[]
}

type AgentType = 'general' | 'cfo' | 'ceo' | 'research' | 'growth'

const AGENT_CONFIG: Record<AgentType, { label: string; icon: React.ElementType; color: string; description: string }> = {
  general: {
    label: 'General',
    icon: Sparkles,
    color: 'text-primary',
    description: 'General business assistant',
  },
  cfo: {
    label: 'CFO',
    icon: TrendingUp,
    color: 'text-emerald-500',
    description: 'Financial strategy agent',
  },
  ceo: {
    label: 'CEO',
    icon: Brain,
    color: 'text-violet-500',
    description: 'Executive summary agent',
  },
  research: {
    label: 'Research',
    icon: Search,
    color: 'text-amber-500',
    description: 'Market intelligence agent',
  },
  growth: {
    label: 'Growth',
    icon: Zap,
    color: 'text-rose-500',
    description: 'Growth strategy agent',
  },
}

// ─── localStorage helpers ──────────────────────────────────────────────────

const STORAGE_KEY = 'gangniaga-chat-history'

function loadChatHistory(): ChatSession[] {
  try {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore parse errors
  }
  return []
}

function saveChatHistory(history: ChatSession[]) {
  try {
    if (typeof window === 'undefined') return
    // Keep only the last 50 sessions to avoid storage bloat
    const trimmed = history.slice(0, 50)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // ignore storage errors (quota exceeded etc.)
  }
}

// ─── Typing Dots Component ─────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-[bounce_1.4s_ease-in-out_infinite]" />
      <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
      <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agentType, setAgentType] = useState<AgentType>('general')
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load chat history from localStorage on mount
  useEffect(() => {
    const stored = loadChatHistory()
    if (stored.length > 0) {
      setChatHistory(stored)
    }
    setIsInitialized(true)
  }, [])

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized && chatHistory.length >= 0) {
      saveChatHistory(chatHistory)
    }
  }, [chatHistory, isInitialized])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  // ─── Update current session in history ─────────────────────────────────

  const updateCurrentSession = useCallback((
    currentMessages: ChatMessage[],
    currentSessionId: string | null,
    currentAgentType: AgentType,
  ) => {
    if (!currentSessionId || currentMessages.length === 0) return

    setChatHistory((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === currentSessionId)
      if (existingIdx >= 0) {
        const updated = [...prev]
        updated[existingIdx] = {
          ...updated[existingIdx],
          messages: currentMessages,
        }
        return updated
      }
      // Create new session entry
      return [
        {
          id: currentSessionId,
          title: currentMessages[0]?.content.slice(0, 50) || 'New Chat',
          agentType: currentAgentType,
          createdAt: new Date().toISOString(),
          messages: currentMessages,
        },
        ...prev,
      ]
    })
  }, [])

  // ─── Send Message ──────────────────────────────────────────────────────

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          agentType,
        }),
      })

      if (!res.ok) throw new Error('Failed to send message')

      const data = await res.json()

      let effectiveSessionId = sessionId
      if (!effectiveSessionId && data.sessionId) {
        effectiveSessionId = data.sessionId
        setSessionId(effectiveSessionId)
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      }

      const allMessages = [...newMessages, assistantMessage]
      setMessages(allMessages)

      // Update chat history
      updateCurrentSession(allMessages, effectiveSessionId, agentType)
    } catch {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ─── New Chat ──────────────────────────────────────────────────────────

  const startNewChat = () => {
    setMessages([])
    setSessionId(null)
    setInput('')
    toast.success('New chat started')
  }

  // ─── Clear Chat ────────────────────────────────────────────────────────

  const clearChat = () => {
    setMessages([])
    setSessionId(null)
    setInput('')
    setChatHistory([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    toast.success('Chat history cleared')
  }

  // ─── Load Chat Session ─────────────────────────────────────────────────

  const loadChatSession = (session: ChatSession) => {
    setMessages(session.messages)
    setSessionId(session.id)
    setAgentType(session.agentType as AgentType)
    setMobileSidebarOpen(false)
  }

  // ─── Delete Chat Session ───────────────────────────────────────────────

  const deleteChatSession = (sessionIdToDelete: string) => {
    setChatHistory((prev) => prev.filter((s) => s.id !== sessionIdToDelete))
    if (sessionId === sessionIdToDelete) {
      setMessages([])
      setSessionId(null)
    }
    toast.success('Chat session deleted')
  }

  // ─── Handle Key Down ───────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ─── Get Agent Icon ────────────────────────────────────────────────────

  const getAgentIcon = (type: AgentType) => {
    return AGENT_CONFIG[type]?.icon || Sparkles
  }

  const currentAgentConfig = AGENT_CONFIG[agentType]

  // ─── Sidebar Content ───────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-sm">Chat History</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-9 text-sm"
          onClick={startNewChat}
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>

      <Separator />

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chatHistory.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No chat history yet</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">Start a new conversation</p>
            </div>
          ) : (
            chatHistory.map((session) => {
              const agentCfg = AGENT_CONFIG[session.agentType as AgentType]
              const AgentIcon = agentCfg?.icon || Sparkles
              return (
                <div
                  key={session.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/80 text-sm group ${
                    sessionId === session.id ? 'bg-muted' : ''
                  }`}
                >
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => loadChatSession(session)}
                  >
                    <div className="flex items-center gap-2">
                      <AgentIcon className={`w-3.5 h-3.5 shrink-0 ${agentCfg?.color || 'text-primary'}`} />
                      <span className="truncate font-medium text-xs">{session.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-5.5">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                        {agentCfg?.label || 'General'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {session.messages.length} msgs
                      </span>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChatSession(session.id)
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Clear Button */}
      {chatHistory.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs"
              onClick={clearChat}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Chats
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0">
      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex flex-col border-r bg-card transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-card border-r shadow-xl">
            <SidebarContent />
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileSidebarOpen(!mobileSidebarOpen)
                } else {
                  setSidebarOpen(!sidebarOpen)
                }
              }}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10">
                  {(() => {
                    const Icon = getAgentIcon(agentType)
                    return <Icon className={`w-4 h-4 ${currentAgentConfig.color}`} />
                  })()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-semibold">{currentAgentConfig.label} Agent</h3>
                <p className="text-[11px] text-muted-foreground">{currentAgentConfig.description}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={startNewChat}>
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-destructive hover:text-destructive" onClick={clearChat}>
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {messages.length === 0 && !isLoading ? (
            <EmptyState agentType={agentType} onSuggestionClick={(text) => setInput(text)} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} agentType={agentType} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10">
                      {(() => {
                        const Icon = getAgentIcon(agentType)
                        return <Icon className={`w-4 h-4 ${currentAgentConfig.color}`} />
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border rounded-xl px-4 py-3">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-card/80 backdrop-blur-sm">
          {/* Agent Type Tabs */}
          <div className="px-4 pt-3">
            <Tabs value={agentType} onValueChange={(v) => setAgentType(v as AgentType)}>
              <TabsList className="h-8">
                {Object.entries(AGENT_CONFIG).map(([key, cfg]) => {
                  const TabIcon = cfg.icon
                  return (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="text-xs gap-1 px-2.5 h-7"
                    >
                      <TabIcon className="w-3 h-3" />
                      <span className="hidden sm:inline">{cfg.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Text Input */}
          <div className="p-4 pt-3">
            <div className="flex items-end gap-2 max-w-3xl mx-auto">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask the ${currentAgentConfig.label} Agent anything...`}
                  className="min-h-[44px] max-h-32 resize-none pr-12 text-sm"
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────

function MessageBubble({ message, agentType }: { message: ChatMessage; agentType: AgentType }) {
  const isUser = message.role === 'user'
  const agentConfig = AGENT_CONFIG[agentType]
  const AgentIcon = agentConfig.icon

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[80%] sm:max-w-[70%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-[10px] text-muted-foreground text-right mt-1 mr-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="bg-primary/10">
          <AgentIcon className={`w-4 h-4 ${agentConfig.color}`} />
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[80%] sm:max-w-[70%]">
        <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-2.5">
          <div className="prose-ai text-sm">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 ml-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────

function EmptyState({
  agentType,
  onSuggestionClick,
}: {
  agentType: AgentType
  onSuggestionClick: (text: string) => void
}) {
  const agentConfig = AGENT_CONFIG[agentType]
  const AgentIcon = agentConfig.icon

  const SUGGESTIONS: Record<AgentType, string[]> = {
    general: [
      'Help me create a business plan for my SaaS startup',
      'What are the key metrics I should track for my business?',
      'Analyze my current business performance',
    ],
    cfo: [
      'Create a cash flow forecast for the next 12 months',
      'What is my current burn rate and runway?',
      'How can I optimize my expenses?',
    ],
    ceo: [
      'Give me an executive summary of business performance',
      'What strategic initiatives should we prioritize?',
      'Analyze our competitive positioning',
    ],
    research: [
      'What are the latest trends in my industry?',
      'Who are our main competitors and their strategies?',
      'What market opportunities should we explore?',
    ],
    growth: [
      'Suggest a customer acquisition strategy',
      'How can I improve customer retention?',
      'What growth channels should we invest in?',
    ],
  }

  const suggestions = SUGGESTIONS[agentType]

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <AgentIcon className={`w-8 h-8 ${agentConfig.color}`} />
      </div>
      <h3 className="text-lg font-semibold mb-1">{agentConfig.label} Agent</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
        {agentType === 'general'
          ? 'Your AI-powered business copilot. Ask anything about your business.'
          : `Specialized in ${agentConfig.description.toLowerCase()}. Ask anything related to this domain.`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl w-full">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            className="text-left p-3 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/20 transition-all text-sm group"
            onClick={() => onSuggestionClick(suggestion)}
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors text-xs leading-relaxed">
                {suggestion}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
