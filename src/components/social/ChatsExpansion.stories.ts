import type { Meta, StoryObj } from '@storybook/vue3'
import { ref, provide } from 'vue'
import { action } from '@storybook/addon-actions'
import { vueRouter } from 'storybook-vue3-router'
import ChatsExpansion from './ChatsExpansion.vue'

// Simple routes for the router
const routes = [
  {
    path: '/',
    name: 'home',
    component: { template: '<div>Home</div>' }
  },
  {
    path: '/workspaces/:workspaceId/chats/:chatId',
    name: 'chat',
    component: { template: '<div>Chat</div>' }
  }
]

// Mock the stores and composables
const mockUserPerfsStore = {
  perfs: {
    enableShortcutKey: 'desktop-only',
    searchDialogKey: { key: 'KeyF', withCtrl: true },
    createSocialKey: { key: 'KeyN', withCtrl: true }
  }
}

const mockWorkspace = {
  id: 'workspace-1',
  name: 'My Workspace',
  avatar: { type: 'icon', icon: 'sym_o_folder' },
  type: 'workspace',
  parentId: 'root',
  vars: {},
  indexContent: '',
  listOpen: {
    dialogs: true,
    assistants: true,
    artifacts: true,
    chats: true
  }
}

const mockUserProvider = {
  isLoggedIn: ref(true),
  currentUserId: ref('user-1'),
  currentUser: ref({
    id: 'user-1',
    name: 'Current User',
    created_at: '2024-01-01T00:00:00Z',
    description: 'Test user'
  })
}

const meta = {
  title: 'Components/Social/ChatsExpansion',
  component: ChatsExpansion,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An expansion panel component that displays a list of chats with search functionality. Features a collapsible header with search and create user chat buttons, and contains ChatList and SearchChats components.'
      }
    }
  },
  argTypes: {
    workspaceId: {
      control: 'text',
      description: 'The ID of the workspace containing the chats'
    }
  },
  args: {
    workspaceId: 'workspace-1'
  }
} satisfies Meta<typeof ChatsExpansion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  decorators: [vueRouter(routes)],
  parameters: {
    docs: {
      description: {
        story: 'Default state of the ChatsExpansion component with chats list'
      }
    }
  },
  render: (args) => ({
    components: { ChatsExpansion },
    setup() {
      // Provide mocked dependencies
      provide('workspace', ref(mockWorkspace))
      provide('user', mockUserProvider)

      return {
        args
      }
    },
    template: `
      <div style="width: 350px; padding: 20px; background: #1c1b1e; border-radius: 8px;">
        <ChatsExpansion v-bind="args" />
      </div>
    `
  })
}
