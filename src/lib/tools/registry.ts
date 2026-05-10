// GangNiaga AI — Tool Registry
// Defines all available tools with their schemas, permissions, and validation logic

export type ToolCategory =
  | 'browser'
  | 'finance'
  | 'communication'
  | 'analytics'
  | 'export'
  | 'crm'
  | 'data'

export interface ToolDefinition {
  name: string
  description: string
  category: ToolCategory
  requiredPermissions: string[]
  inputSchema: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
  outputSchema?: {
    type: string
    properties: Record<string, any>
  }
  rateLimited?: boolean
  maxExecutionsPerMinute?: number
  timeout?: number // ms, default 30000
  sandboxed?: boolean
  requiresApproval?: boolean
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  web_search: {
    name: 'web_search',
    description: 'Search the web for information using AI-powered search',
    category: 'analytics',
    requiredPermissions: ['search.execute'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        maxResults: {
          type: 'number',
          description: 'Max results to return',
          default: 5,
        },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
              snippet: { type: 'string' },
            },
          },
        },
        totalResults: { type: 'number' },
      },
    },
    rateLimited: true,
    maxExecutionsPerMinute: 10,
    timeout: 15000,
  },

  forecast_calculate: {
    name: 'forecast_calculate',
    description: 'Calculate financial forecasts with scenario modeling',
    category: 'finance',
    requiredPermissions: ['forecast.execute'],
    inputSchema: {
      type: 'object',
      properties: {
        forecastId: { type: 'string', description: 'ID of the forecast to calculate' },
        scenario: {
          type: 'string',
          enum: ['best', 'base', 'worst', 'custom'],
          description: 'Scenario type',
        },
        months: {
          type: 'number',
          default: 12,
          description: 'Number of months to project',
        },
        adjustments: {
          type: 'object',
          description: 'Custom scenario adjustments (multipliers, overrides)',
        },
      },
      required: ['forecastId', 'scenario'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        projections: { type: 'array' },
        summary: { type: 'object' },
        scenario: { type: 'string' },
      },
    },
    timeout: 60000,
  },

  browser_navigate: {
    name: 'browser_navigate',
    description:
      'Navigate to a URL and extract content using browser automation',
    category: 'browser',
    requiredPermissions: ['browser.execute'],
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to' },
        action: {
          type: 'string',
          enum: ['screenshot', 'extract_text', 'extract_links', 'fill_form', 'click'],
          description: 'Action to perform on the page',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for targeted actions',
        },
        value: {
          type: 'string',
          description: 'Value for form filling or input actions',
        },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'string' },
        url: { type: 'string' },
        action: { type: 'string' },
      },
    },
    rateLimited: true,
    maxExecutionsPerMinute: 5,
    timeout: 30000,
    sandboxed: true,
    requiresApproval: false,
  },

  email_send: {
    name: 'email_send',
    description: 'Send an email notification',
    category: 'communication',
    requiredPermissions: ['email.execute'],
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body content' },
        cc: { type: 'string', description: 'CC recipient email address' },
      },
      required: ['to', 'subject', 'body'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        sent: { type: 'boolean' },
        messageId: { type: 'string' },
      },
    },
    rateLimited: true,
    maxExecutionsPerMinute: 10,
    requiresApproval: true,
  },

  export_generate: {
    name: 'export_generate',
    description: 'Generate a document export (PDF, DOCX, PPTX, XLSX)',
    category: 'export',
    requiredPermissions: ['export.execute'],
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['plan', 'report', 'forecast', 'kpi'],
          description: 'Type of content to export',
        },
        format: {
          type: 'string',
          enum: ['pdf', 'docx', 'pptx', 'xlsx', 'csv'],
          description: 'Output format',
        },
        contentId: { type: 'string', description: 'ID of the content to export' },
        title: { type: 'string', description: 'Title for the exported document' },
      },
      required: ['type', 'format', 'contentId', 'title'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        exportId: { type: 'string' },
        status: { type: 'string' },
        fileUrl: { type: 'string' },
      },
    },
    timeout: 60000,
  },

  crm_lookup: {
    name: 'crm_lookup',
    description: 'Look up customer data from CRM',
    category: 'crm',
    requiredPermissions: ['crm.read'],
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for CRM lookup' },
        entity: {
          type: 'string',
          enum: ['customer', 'deal', 'contact'],
          description: 'CRM entity type to search',
        },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array' },
        total: { type: 'number' },
      },
    },
  },

  analytics_query: {
    name: 'analytics_query',
    description: 'Query analytics data for business metrics',
    category: 'analytics',
    requiredPermissions: ['analytics.read'],
    inputSchema: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          description: 'Metric name to query (e.g. revenue, churn, mrr)',
        },
        period: {
          type: 'string',
          description: 'Time period (e.g. this_month, last_quarter, this_year)',
        },
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dimensions to group by',
        },
      },
      required: ['metric'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        metric: { type: 'string' },
        value: { type: 'number' },
        period: { type: 'string' },
        breakdown: { type: 'array' },
      },
    },
  },

  kpi_update: {
    name: 'kpi_update',
    description: 'Update a KPI value',
    category: 'data',
    requiredPermissions: ['kpi.write'],
    inputSchema: {
      type: 'object',
      properties: {
        kpiId: { type: 'string', description: 'ID of the KPI to update' },
        value: { type: 'number', description: 'New value for the KPI' },
        period: {
          type: 'string',
          description: 'Period for this KPI value (e.g. 2025-01, Q1-2025)',
        },
      },
      required: ['kpiId', 'value'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        kpiId: { type: 'string' },
        previousValue: { type: 'number' },
        newValue: { type: 'number' },
        updated: { type: 'boolean' },
      },
    },
  },

  notification_send: {
    name: 'notification_send',
    description: 'Send an in-app notification to users',
    category: 'communication',
    requiredPermissions: ['notification.execute'],
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'ID of the user to notify' },
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification message body' },
        type: {
          type: 'string',
          enum: ['info', 'warning', 'error', 'success'],
          description: 'Notification severity type',
        },
      },
      required: ['userId', 'title', 'message'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        notificationId: { type: 'string' },
        sent: { type: 'boolean' },
      },
    },
  },

  code_execute: {
    name: 'code_execute',
    description: 'Execute code in a sandboxed environment',
    category: 'analytics',
    requiredPermissions: ['code.execute'],
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          enum: ['javascript', 'python', 'sql'],
          description: 'Programming language of the code',
        },
        code: { type: 'string', description: 'Source code to execute' },
        timeout: {
          type: 'number',
          default: 10000,
          description: 'Execution timeout in ms',
        },
      },
      required: ['language', 'code'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        stdout: { type: 'string' },
        stderr: { type: 'string' },
        exitCode: { type: 'number' },
        executionTime: { type: 'number' },
      },
    },
    sandboxed: true,
    requiresApproval: true,
    timeout: 15000,
  },
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Retrieve a single tool definition by name.
 */
export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS[name]
}

/**
 * Retrieve all tool definitions that belong to a given category.
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  return Object.values(TOOL_DEFINITIONS).filter((t) => t.category === category)
}

/**
 * Return an array of all registered tool names.
 */
export function getAllToolNames(): string[] {
  return Object.keys(TOOL_DEFINITIONS)
}

// ─── Input Validation ─────────────────────────────────────────────────────────

interface PropertySchema {
  type: string
  description?: string
  enum?: string[]
  default?: any
  items?: { type: string }
}

/**
 * Validate tool input against the tool's input schema.
 *
 * Checks:
 *  1. All required fields are present
 *  2. Field types match the declared types
 *  3. Enum values are valid (when applicable)
 *
 * Returns `{ valid: true }` on success or `{ valid: false, errors }` on failure.
 */
export function validateToolInput(
  toolName: string,
  input: Record<string, any>,
): { valid: boolean; errors?: string[] } {
  const tool = getTool(toolName)
  if (!tool) {
    return { valid: false, errors: [`Unknown tool: ${toolName}`] }
  }

  const errors: string[] = []
  const { properties, required } = tool.inputSchema

  // 1. Check required fields
  if (required && required.length > 0) {
    for (const field of required) {
      if (input[field] === undefined || input[field] === null || input[field] === '') {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }

  // 2. Type-check present fields
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue

    const prop = properties[key] as PropertySchema | undefined
    if (!prop) {
      // Extra fields are allowed but not validated
      continue
    }

    // Enum validation
    if (prop.enum && typeof value === 'string' && !prop.enum.includes(value)) {
      errors.push(
        `Field "${key}" must be one of: ${prop.enum.join(', ')}. Got: "${value}"`,
      )
      continue
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value
    const expectedType = prop.type

    if (expectedType === 'number' && actualType !== 'number') {
      errors.push(
        `Field "${key}" must be a number. Got: ${actualType}`,
      )
    } else if (expectedType === 'string' && actualType !== 'string') {
      errors.push(
        `Field "${key}" must be a string. Got: ${actualType}`,
      )
    } else if (expectedType === 'object' && actualType !== 'object') {
      errors.push(
        `Field "${key}" must be an object. Got: ${actualType}`,
      )
    } else if (expectedType === 'array' && actualType !== 'array') {
      errors.push(
        `Field "${key}" must be an array. Got: ${actualType}`,
      )
    } else if (expectedType === 'boolean' && actualType !== 'boolean') {
      errors.push(
        `Field "${key}" must be a boolean. Got: ${actualType}`,
      )
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }
  return { valid: true }
}
