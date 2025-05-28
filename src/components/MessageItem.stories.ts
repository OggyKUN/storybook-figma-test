import type { Meta, StoryObj } from '@storybook/vue3'
import { ref, provide, computed, nextTick, reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { fn } from '@storybook/test'
import MessageItem from './MessageItem.vue'
import { useAssistantsStore } from '../stores/assistants'
import { useUserPerfsStore } from '../stores/user-perfs'
import type { Message, Assistant, StoredItem, Avatar } from '../utils/types'

// Mock router
const mockRouter = {
  push: fn(),
  replace: fn(),
  go: fn(),
  back: fn(),
  forward: fn()
}

// Mock sessions
const mockSessions = {
  ping: async (sessionId: string) => true
}

// Mock db
const mockDb = {
  messages: {
    update: fn()
  }
}

// Default model settings
const defaultModelSettings = {
  temperature: 0.6,
  topP: 1,
  presencePenalty: 0,
  frequencyPenalty: 0,
  maxSteps: 4,
  maxRetries: 1
}

// Mock data
const mockAssistants: Assistant[] = [
  {
    id: 'assistant-1',
    name: 'Claude Assistant',
    avatar: {
      type: 'text',
      text: 'C',
      hue: 200
    } as Avatar,
    workspaceId: 'workspace-1',
    prompt: 'You are a helpful AI assistant.',
    promptTemplate: 'You are a helpful AI assistant.',
    promptVars: [],
    provider: null,
    model: null,
    modelSettings: { ...defaultModelSettings },
    plugins: {},
    promptRole: 'system',
    stream: true
  },
  {
    id: 'assistant-2',
    name: 'GPT Assistant',
    avatar: {
      type: 'icon',
      icon: 'smart_toy',
      hue: 120
    } as Avatar,
    workspaceId: 'workspace-1',
    prompt: 'You are GPT, a large language model.',
    promptTemplate: 'You are GPT, a large language model.',
    promptVars: [],
    provider: null,
    model: null,
    modelSettings: { ...defaultModelSettings },
    plugins: {},
    promptRole: 'system',
    stream: true
  }
]

const mockItems: StoredItem[] = [
  {
    id: 'item-1',
    dialogId: 'dialog-1',
    type: 'file',
    name: 'example.txt',
    mimeType: 'text/plain',
    contentText: 'This is a sample text file content.',
    contentBuffer: null,
    references: 1
  },
  {
    id: 'item-2',
    dialogId: 'dialog-1',
    type: 'quote',
    name: 'Important Quote',
    contentText: 'This is an important quote from the conversation.',
    contentBuffer: null,
    references: 1
  }
]

// Mock messages
const userMessage: Message = {
  id: 'msg-1',
  type: 'user',
  dialogId: 'dialog-1',
  workspaceId: 'workspace-1',
  contents: [
    {
      type: 'user-message',
      text: 'Hello! Can you help me understand how Vue 3 composition API works?',
      items: ['item-1']
    }
  ],
  status: 'default',
  modelName: 'gpt-4'
}

const assistantMessage: Message = {
  id: 'msg-2',
  type: 'assistant',
  assistantId: 'assistant-1',
  dialogId: 'dialog-1',
  workspaceId: 'workspace-1',
  contents: [
    {
      type: 'assistant-message',
      text: `# Vue 3 Composition API

The Vue 3 Composition API is a powerful way to organize and reuse logic in Vue components. Here's a comprehensive overview:

## Key Concepts

### 1. Setup Function
The \`setup()\` function is the entry point for using the Composition API:

\`\`\`javascript
import { ref, computed, onMounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const doubleCount = computed(() => count.value * 2)

    onMounted(() => {
      console.log('Component mounted!')
    })

    return {
      count,
      doubleCount
    }
  }
}
\`\`\`

### 2. Reactivity
- **ref()**: Creates reactive references for primitive values
- **reactive()**: Creates reactive objects
- **computed()**: Creates computed properties

### 3. Lifecycle Hooks
- \`onMounted()\`
- \`onUpdated()\`
- \`onUnmounted()\`
- And many more...

## Benefits
1. **Better TypeScript support**
2. **Improved code organization**
3. **Enhanced reusability**
4. **Tree-shaking friendly**

Would you like me to explain any specific part in more detail?`,
      reasoning: 'The user is asking about Vue 3 Composition API, so I should provide a comprehensive overview covering the key concepts, syntax, and benefits. I\'ll include code examples to make it practical and easy to understand.'
    }
  ],
  status: 'default',
  modelName: 'claude-3-5-sonnet'
}

const streamingMessage: Message = {
  id: 'msg-4',
  type: 'assistant',
  assistantId: 'assistant-1',
  dialogId: 'dialog-1',
  workspaceId: 'workspace-1',
  contents: [
    {
      type: 'assistant-message',
      text: 'I\'m currently thinking about your question and will provide a detailed response...'
    }
  ],
  status: 'streaming',
  generatingSession: 'session-123',
  modelName: 'claude-3-5-sonnet'
}

const errorMessage: Message = {
  id: 'msg-5',
  type: 'assistant',
  assistantId: 'assistant-1',
  dialogId: 'dialog-1',
  workspaceId: 'workspace-1',
  contents: [
    {
      type: 'assistant-message',
      text: 'I was trying to help you with that request, but encountered an issue.'
    }
  ],
  status: 'failed',
  error: 'API rate limit exceeded. Please try again in a few minutes.',
  warnings: ['This model has limited context window', 'Response may be truncated'],
  modelName: 'gpt-4'
}

const userMessageWithFiles: Message = {
  id: 'msg-6',
  type: 'user',
  dialogId: 'dialog-1',
  workspaceId: 'workspace-1',
  contents: [
    {
      type: 'user-message',
      text: 'Here are some files I\'d like you to review:',
      items: ['item-1', 'item-2']
    }
  ],
  status: 'default',
  modelName: 'gpt-4'
}

// Set up global mocks
;(globalThis as any).db = mockDb
;(globalThis as any).sessions = mockSessions

const meta = {
  title: 'Components/MessageItem',
  component: MessageItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'The MessageItem component displays individual messages in a conversation. It supports both user and assistant messages, with features like markdown rendering, file attachments, tool calls, and interactive elements like copy, edit, and regenerate buttons.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    message: {
      description: 'The message object containing content, type, and metadata',
      control: { type: 'object' }
    },
    childNum: {
      description: 'Number of child messages (for pagination)',
      control: { type: 'number' }
    },
    scrollContainer: {
      description: 'The scroll container element for catalog positioning',
      control: false
    }
  },
  decorators: [
    (story, context) => ({
      components: { story },
      setup() {
        // Create fresh pinia instance for each story
        const pinia = createPinia()
        setActivePinia(pinia)

        // Initialize stores
        const assistantsStore = useAssistantsStore()
        const userPerfsStore = useUserPerfsStore()

        // Set up mock data in stores
        assistantsStore.assistants = mockAssistants
        userPerfsStore.perfs = {
          darkMode: false,
          themeHue: 300,
          provider: null,
          model: {
            name: 'gpt-4',
            inputTypes: {
              user: ['text/*', 'image/*'],
              assistant: ['text/*'],
              tool: ['text/*']
            }
          },
          systemProvider: null,
          systemModel: {
            name: 'gpt-4o-mini',
            inputTypes: {
              user: ['text/*'],
              assistant: ['text/*'],
              tool: ['text/*']
            }
          },
          userAvatar: {
            type: 'text',
            text: 'U',
            hue: 300
          },
          commonModelOptions: ['gpt-4', 'gpt-4o-mini', 'claude-3-5-sonnet'],
          autoGenTitle: true,
          sendKey: 'ctrl+enter',
          messageSelectionBtn: true,
          codePasteOptimize: true,
          dialogScrollBtn: 'always',
          enableShortcutKey: 'desktop-only',
          scrollUpKeyV2: { key: 'ArrowUp', withCtrl: true },
          scrollDownKeyV2: { key: 'ArrowDown', withCtrl: true },
          scrollTopKey: { key: 'Home' },
          scrollBottomKey: { key: 'End' },
          switchPrevKeyV2: { key: 'ArrowLeft', withCtrl: true },
          switchNextKeyV2: { key: 'ArrowRight', withCtrl: true },
          switchFirstKey: { key: 'Home', withShift: true },
          switchLastKey: { key: 'End', withShift: true },
          regenerateCurrKey: null,
          editCurrKey: null,
          createDialogKey: null,
          createSocialKey: null,
          focusDialogInputKey: null,
          saveArtifactKey: { key: 'KeyS', withCtrl: true },
          searchDialogKey: null,
          searchChatsKey: null,
          autoFocusDialogInput: 'desktop-only',
          artifactsEnabled: 'desktop-only',
          artifactsAutoExtract: false,
          artifactsAutoName: false,
          artifactsReserveOriginal: false,
          mdPreviewTheme: 'vuepress',
          mdCodeTheme: 'atom',
          mdNoMermaid: false,
          mdAutoFoldThreshold: null,
          streamingLockBottom: true,
          messageCatalog: true,
          showWarnings: true
        }

        // Provide required injections
        const itemMapRef = computed(() => {
          const map = {}
          mockItems.forEach(item => { map[item.id] = item })
          return map
        })

        const showArtifactsRef = computed(() => false)

        provide('itemMap', itemMapRef)
        provide('showArtifacts', showArtifactsRef)
        provide('$router', mockRouter)

        // Create a mock scroll container
        const scrollContainer = ref(document.createElement('div'))

        return { scrollContainer }
      },
      template: `
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          <story :scroll-container="scrollContainer" />
        </div>
      `
    })
  ]
} satisfies Meta<typeof MessageItem>

export default meta
type Story = StoryObj<typeof meta>

export const UserMessage: Story = {
  args: {
    message: userMessage,
    childNum: 1,
    scrollContainer: document.createElement('div')
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic user message with text content and a file attachment.'
      }
    }
  }
}

export const AssistantMessage: Story = {
  args: {
    message: assistantMessage,
    childNum: 1,
    scrollContainer: document.createElement('div')
  },
  parameters: {
    docs: {
      description: {
        story: 'An assistant message with rich markdown content including code blocks, headers, and lists. Also shows reasoning content in a collapsible section.'
      }
    }
  }
}

export const StreamingMessage: Story = {
  args: {
    message: streamingMessage,
    childNum: 1,
    scrollContainer: document.createElement('div')
  },
  parameters: {
    docs: {
      description: {
        story: 'A message that is currently being streamed from the AI, showing the loading state with a progress indicator.'
      }
    }
  }
}

export const ErrorMessage: Story = {
  args: {
    message: errorMessage,
    childNum: 1,
    scrollContainer: document.createElement('div')
  },
  parameters: {
    docs: {
      description: {
        story: 'A message that failed to generate, showing error state with error message and warnings.'
      }
    }
  }
}

export const UserMessageWithFiles: Story = {
  args: {
    message: userMessageWithFiles,
    childNum: 1,
    scrollContainer: document.createElement('div')
  },
  parameters: {
    docs: {
      description: {
        story: 'A user message with multiple file attachments, demonstrating how files are displayed in the message.'
      }
    }
  }
}

export const MessageWithBranches: Story = {
  args: {
    message: assistantMessage,
    childNum: 3,
    scrollContainer: document.createElement('div')
  },
  parameters: {
    docs: {
      description: {
        story: 'A message with multiple branches/alternatives, showing pagination controls for navigating between different response variants.'
      }
    }
  }
}

export const CompactMode: Story = {
  args: {
    message: assistantMessage,
    childNum: 1,
    scrollContainer: document.createElement('div')
  },
  decorators: [
    (story, context) => ({
      components: { story },
      setup() {
        const pinia = createPinia()
        setActivePinia(pinia)

        const assistantsStore = useAssistantsStore()
        const userPerfsStore = useUserPerfsStore()

        assistantsStore.assistants = mockAssistants
        userPerfsStore.perfs = {
          darkMode: false,
          themeHue: 300,
          provider: null,
          model: {
            name: 'gpt-4',
            inputTypes: {
              user: ['text/*', 'image/*'],
              assistant: ['text/*'],
              tool: ['text/*']
            }
          },
          systemProvider: null,
          systemModel: {
            name: 'gpt-4o-mini',
            inputTypes: {
              user: ['text/*'],
              assistant: ['text/*'],
              tool: ['text/*']
            }
          },
          userAvatar: {
            type: 'text',
            text: 'U',
            hue: 300
          },
          commonModelOptions: ['gpt-4', 'gpt-4o-mini', 'claude-3-5-sonnet'],
          autoGenTitle: true,
          sendKey: 'ctrl+enter',
          messageSelectionBtn: true,
          codePasteOptimize: true,
          dialogScrollBtn: 'always',
          enableShortcutKey: 'desktop-only',
          scrollUpKeyV2: { key: 'ArrowUp', withCtrl: true },
          scrollDownKeyV2: { key: 'ArrowDown', withCtrl: true },
          scrollTopKey: { key: 'Home' },
          scrollBottomKey: { key: 'End' },
          switchPrevKeyV2: { key: 'ArrowLeft', withCtrl: true },
          switchNextKeyV2: { key: 'ArrowRight', withCtrl: true },
          switchFirstKey: { key: 'Home', withShift: true },
          switchLastKey: { key: 'End', withShift: true },
          regenerateCurrKey: null,
          editCurrKey: null,
          createDialogKey: null,
          createSocialKey: null,
          focusDialogInputKey: null,
          saveArtifactKey: { key: 'KeyS', withCtrl: true },
          searchDialogKey: null,
          searchChatsKey: null,
          autoFocusDialogInput: 'desktop-only',
          artifactsEnabled: 'desktop-only',
          artifactsAutoExtract: false,
          artifactsAutoName: false,
          artifactsReserveOriginal: false,
          mdPreviewTheme: 'vuepress',
          mdCodeTheme: 'atom',
          mdNoMermaid: false,
          mdAutoFoldThreshold: null,
          streamingLockBottom: true,
          messageCatalog: true,
          showWarnings: true
        }

        const itemMapRef = computed(() => {
          const map = {}
          mockItems.forEach(item => { map[item.id] = item })
          return map
        })

        // Force compact mode by simulating small screen
        const showArtifactsRef = computed(() => true)

        provide('itemMap', itemMapRef)
        provide('showArtifacts', showArtifactsRef)
        provide('$router', mockRouter)

        const scrollContainer = ref(document.createElement('div'))

        return { scrollContainer }
      },
      template: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <story :scroll-container="scrollContainer" />
        </div>
      `
    })
  ],
  parameters: {
    docs: {
      description: {
        story: 'The message component in compact/dense mode, typically used on smaller screens or when artifacts panel is open.'
      }
    }
  }
}

export const InteractiveFeatures: Story = {
  args: {
    message: assistantMessage,
    childNum: 1,
    scrollContainer: document.createElement('div')
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates interactive features like text selection, copy buttons, regenerate, and context menu options. Try selecting text to see the floating action buttons.'
      }
    }
  },
  play: async ({ canvasElement }) => {
    // Add some interactive demonstration
    await nextTick()

    // You could add interactions here to demonstrate features
    console.log('MessageItem story loaded with interactive features')
  }
}

// New stories as requested

export const AssistantWithCodeSnippet: Story = {
  args: {
    message: {
      id: 'msg-code-snippet',
      type: 'assistant',
      assistantId: 'assistant-2',
      dialogId: 'dialog-1',
      workspaceId: 'workspace-1',
      contents: [
        {
          type: 'assistant-message',
          text: `I'll help you create a simple React component with hooks. Here's an example:

\`\`\`jsx
import React, { useState, useEffect } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  const [isEven, setIsEven] = useState(true);

  useEffect(() => {
    setIsEven(count % 2 === 0);
  }, [count]);

  const increment = () => {
    setCount(prevCount => prevCount + 1);
  };

  const decrement = () => {
    setCount(prevCount => prevCount - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="counter">
      <h2>Counter: {count}</h2>
      <p>The number is {isEven ? 'even' : 'odd'}</p>

      <div className="buttons">
        <button onClick={increment}>+</button>
        <button onClick={decrement}>-</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}

export default Counter;
\`\`\`

This component demonstrates:
- **useState** for managing state
- **useEffect** for side effects
- **Event handlers** for user interactions
- **Conditional rendering** based on state

You can also add some CSS to make it look better:

\`\`\`css
.counter {
  text-align: center;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  max-width: 300px;
  margin: 0 auto;
}

.buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 15px;
}

.buttons button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}

.buttons button:hover {
  background-color: #0056b3;
}
\`\`\`

This creates a fully functional counter component with styling!`
        }
      ],
      status: 'default',
      modelName: 'gpt-4'
    },
    childNum: 1,
    scrollContainer: document.createElement('div')
  },
  parameters: {
    docs: {
      description: {
        story: 'An assistant message featuring multiple code snippets in different languages (JSX and CSS), demonstrating syntax highlighting and code block formatting.'
      }
    }
  }
}
