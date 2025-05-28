import type { Meta, StoryObj } from '@storybook/vue3'
import { ref, provide } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { QLayout } from 'quasar'
import WorkspaceSettings from '../views/WorkspaceSettings.vue'
import { useWorkspacesStore } from '../stores/workspaces'
import { useAssistantsStore } from '../stores/assistants'
import { useUiStateStore } from '../stores/ui-state'
import type { Workspace, Assistant } from '../utils/types'

// Mock data
const mockWorkspace: Workspace = {
  id: 'workspace-1',
  name: 'My Workspace',
  avatar: {
    type: 'icon',
    icon: 'sym_o_work',
    hue: 200,
    title: 'Work Icon'
  },
  type: 'workspace',
  parentId: 'root',
  vars: {
    API_KEY: 'sk-1234567890',
    PROJECT_NAME: 'My Project',
    ENVIRONMENT: 'development'
  },
  indexContent: 'Welcome to my workspace! This is the home content that appears when you first enter the workspace.',
  defaultAssistantId: 'assistant-1',
  lastDialogId: 'dialog-1',
  listOpen: {
    assistants: true,
    artifacts: false,
    dialogs: true,
    chats: false
  }
}

const mockAssistants: Assistant[] = [
  {
    id: 'assistant-1',
    name: 'Code Assistant',
    avatar: {
      type: 'icon',
      icon: 'sym_o_code',
      hue: 120,
      title: 'Code Icon'
    },
    prompt: 'You are a helpful coding assistant.',
    promptVars: [],
    promptTemplate: 'You are a helpful coding assistant.',
    provider: {
      type: 'openai',
      settings: {}
    },
    modelSettings: {
      temperature: 0.7,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      maxSteps: 10,
      maxRetries: 3,
      maxTokens: 4000
    },
    workspaceId: 'workspace-1',
    plugins: {},
    promptRole: 'system',
    contextNum: 10,
    stream: true,
    description: 'A helpful assistant for coding tasks'
  },
  {
    id: 'assistant-2',
    name: 'Writing Assistant',
    avatar: {
      type: 'icon',
      icon: 'sym_o_edit',
      hue: 280,
      title: 'Edit Icon'
    },
    prompt: 'You are a helpful writing assistant.',
    promptVars: [],
    promptTemplate: 'You are a helpful writing assistant.',
    provider: {
      type: 'openai',
      settings: {}
    },
    modelSettings: {
      temperature: 0.8,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      maxSteps: 10,
      maxRetries: 3,
      maxTokens: 4000
    },
    workspaceId: 'workspace-1',
    plugins: {},
    promptRole: 'system',
    contextNum: 10,
    stream: true,
    description: 'A helpful assistant for writing tasks'
  },
  {
    id: 'assistant-global',
    name: 'Global Assistant',
    avatar: {
      type: 'icon',
      icon: 'sym_o_public',
      hue: 60,
      title: 'Global Icon'
    },
    prompt: 'You are a global assistant.',
    promptVars: [],
    promptTemplate: 'You are a global assistant.',
    provider: {
      type: 'openai',
      settings: {}
    },
    modelSettings: {
      temperature: 0.7,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      maxSteps: 10,
      maxRetries: 3,
      maxTokens: 4000
    },
    workspaceId: '$root',
    plugins: {},
    promptRole: 'system',
    contextNum: 10,
    stream: true,
    description: 'A global assistant available in all workspaces'
  }
]

// Enhanced i18n messages for WorkspaceSettings
const workspaceSettingsMessages = {
  'workspaceSettings.title': 'Workspace Settings',
  'workspaceSettings.defaultAssistant': 'Default Assistant',
  'workspaceSettings.avatar': 'Workspace Icon',
  'workspaceSettings.homeContent': 'Home Content',
  'workspaceSettings.variables': 'Workspace Variables',
  'workspaceSettings.inputPlaceholder': 'Enter variable content...',
  'assistantItem.unselected': 'No assistant selected',
  'assistantItem.global': 'Global'
}

const meta = {
  title: 'Views/WorkspaceSettings',
  component: WorkspaceSettings,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The WorkspaceSettings view allows users to configure workspace-specific settings including default assistant, workspace icon, home content, and workspace variables.'
      }
    }
  },
  tags: ['autodocs'],
  decorators: [
    (story, context) => ({
      components: { story, QLayout },
      setup() {
        // Create fresh pinia instance for each story
        const pinia = createPinia()
        setActivePinia(pinia)

        // Initialize stores
        const workspacesStore = useWorkspacesStore()
        const assistantsStore = useAssistantsStore()
        const uiStateStore = useUiStateStore()

        // Mock store methods
        workspacesStore.putItem = async (workspace: Workspace) => {
          console.log('Workspace updated:', workspace)
          return 'mocked-id'
        }

        // Set up assistants in store
        assistantsStore.assistants = mockAssistants

        // Provide workspace as injection
        const workspaceRef = ref(mockWorkspace)
        provide('workspace', workspaceRef)
        provide('rightDrawerAbove', false)

        return {}
      },
      template: `
        <q-layout view="lHh Lpr lFf">
          <story />
        </q-layout>
      `
    })
  ]
} satisfies Meta<typeof WorkspaceSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Default State',
  parameters: {
    docs: {
      description: {
        story: 'The default state of the workspace settings with a workspace that has all fields populated.'
      }
    }
  }
}

export const EmptyWorkspace: Story = {
  name: 'Empty Workspace',
  decorators: [
    (story) => ({
      components: { story, QLayout },
      setup() {
        const pinia = createPinia()
        setActivePinia(pinia)

        const workspacesStore = useWorkspacesStore()
        const assistantsStore = useAssistantsStore()

        workspacesStore.putItem = async (workspace: Workspace) => {
          console.log('Workspace updated:', workspace)
          return 'mocked-id'
        }

        assistantsStore.assistants = mockAssistants

        const emptyWorkspace: Workspace = {
          ...mockWorkspace,
          vars: {},
          indexContent: '',
          defaultAssistantId: undefined
        }

        const workspaceRef = ref(emptyWorkspace)
        provide('workspace', workspaceRef)
        provide('rightDrawerAbove', false)

        return {}
      },
      template: `
        <q-layout view="lHh Lpr lFf">
          <story />
        </q-layout>
      `
    })
  ],
  parameters: {
    docs: {
      description: {
        story: 'Workspace settings with empty or minimal configuration.'
      }
    }
  }
}

export const WithManyVariables: Story = {
  name: 'Many Variables',
  decorators: [
    (story) => ({
      components: { story, QLayout },
      setup() {
        const pinia = createPinia()
        setActivePinia(pinia)

        const workspacesStore = useWorkspacesStore()
        const assistantsStore = useAssistantsStore()

        workspacesStore.putItem = async (workspace: Workspace) => {
          console.log('Workspace updated:', workspace)
          return 'mocked-id'
        }

        assistantsStore.assistants = mockAssistants

        const workspaceWithManyVars: Workspace = {
          ...mockWorkspace,
          vars: {
            API_KEY: 'sk-1234567890abcdef',
            PROJECT_NAME: 'Advanced AI Project',
            ENVIRONMENT: 'production',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
            REDIS_URL: 'redis://localhost:6379',
            SECRET_KEY: 'super-secret-key-12345',
            DEBUG_MODE: 'false',
            LOG_LEVEL: 'info',
            MAX_WORKERS: '4',
            TIMEOUT: '30'
          }
        }

        const workspaceRef = ref(workspaceWithManyVars)
        provide('workspace', workspaceRef)
        provide('rightDrawerAbove', false)

        return {}
      },
      template: `
        <q-layout view="lHh Lpr lFf">
          <story />
        </q-layout>
      `
    })
  ],
  parameters: {
    docs: {
      description: {
        story: 'Workspace settings with many variables to test the variables input component.'
      }
    }
  }
}

export const NoAssistants: Story = {
  name: 'No Assistants Available',
  decorators: [
    (story) => ({
      components: { story, QLayout },
      setup() {
        const pinia = createPinia()
        setActivePinia(pinia)

        const workspacesStore = useWorkspacesStore()
        const assistantsStore = useAssistantsStore()

        workspacesStore.putItem = async (workspace: Workspace) => {
          console.log('Workspace updated:', workspace)
          return 'mocked-id'
        }

        // No assistants available
        assistantsStore.assistants = []

        const workspaceRef = ref(mockWorkspace)
        provide('workspace', workspaceRef)
        provide('rightDrawerAbove', false)

        return {}
      },
      template: `
        <q-layout view="lHh Lpr lFf">
          <story />
        </q-layout>
      `
    })
  ],
  parameters: {
    docs: {
      description: {
        story: 'Workspace settings when no assistants are available for selection.'
      }
    }
  }
}

export const LongContent: Story = {
  name: 'Long Home Content',
  decorators: [
    (story) => ({
      components: { story, QLayout },
      setup() {
        const pinia = createPinia()
        setActivePinia(pinia)

        const workspacesStore = useWorkspacesStore()
        const assistantsStore = useAssistantsStore()

        workspacesStore.putItem = async (workspace: Workspace) => {
          console.log('Workspace updated:', workspace)
          return 'mocked-id'
        }

        assistantsStore.assistants = mockAssistants

        const workspaceWithLongContent: Workspace = {
          ...mockWorkspace,
          indexContent: `# Welcome to My Advanced AI Workspace

This is a comprehensive workspace designed for advanced AI development and research. Here you'll find everything you need to build, test, and deploy cutting-edge AI applications.

## Features

- **Multiple AI Assistants**: Choose from various specialized assistants for different tasks
- **Custom Variables**: Set up workspace-specific variables for your projects
- **Rich Content Support**: Full markdown support for documentation and notes
- **Collaborative Environment**: Share and collaborate with team members

## Getting Started

1. Configure your default assistant
2. Set up your workspace variables
3. Customize your workspace icon
4. Start building amazing AI applications!

## Resources

- [Documentation](https://docs.example.com)
- [API Reference](https://api.example.com)
- [Community Forum](https://forum.example.com)
- [Support](https://support.example.com)

Happy coding! 🚀`
        }

        const workspaceRef = ref(workspaceWithLongContent)
        provide('workspace', workspaceRef)
        provide('rightDrawerAbove', false)

        return {}
      },
      template: `
        <q-layout view="lHh Lpr lFf">
          <story />
        </q-layout>
      `
    })
  ],
  parameters: {
    docs: {
      description: {
        story: 'Workspace settings with long home content to test the autogrow text input.'
      }
    }
  }
}
