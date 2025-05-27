import type { Meta, StoryObj } from '@storybook/vue3'
import { ref, provide } from 'vue'
import { action } from '@storybook/addon-actions'
import { vueRouter } from 'storybook-vue3-router'
import DialogsExpansion from './DialogsExpansion.vue'

// Simple routes for the router
const routes = [
  {
    path: '/',
    name: 'home',
    component: { template: '<div>Home</div>' }
  },
  {
    path: '/workspaces/:workspaceId/dialogs/:dialogId',
    name: 'dialog',
    component: { template: '<div>Dialog</div>' }
  }
]

// Mock the stores and composables
const mockUserPerfsStore = {
  perfs: {
    enableShortcutKey: 'desktop-only',
    searchDialogKey: { key: 'KeyF', withCtrl: true },
    dialogScrollBtn: 'always'
  }
}

const mockWorkspace = {
  id: 'workspace-1',
  name: 'My Workspace',
  listOpen: {
    dialogs: true,
    assistants: true,
    artifacts: true
  }
}

const mockDialogs = [
  {
    id: 'dialog-1',
    name: 'Chat about Vue.js',
    workspaceId: 'workspace-1',
    createdAt: new Date('2024-01-15'),
    msgTree: { $root: ['msg-1'] }
  },
  {
    id: 'dialog-2',
    name: 'TypeScript Best Practices',
    workspaceId: 'workspace-1',
    createdAt: new Date('2024-01-14'),
    msgTree: { $root: ['msg-2'] }
  },
  {
    id: 'dialog-3',
    name: 'Storybook Component Development',
    workspaceId: 'workspace-1',
    createdAt: new Date('2024-01-13'),
    msgTree: { $root: ['msg-3'] }
  },
  {
    id: 'dialog-4',
    name: 'Quasar Framework Tutorial',
    workspaceId: 'workspace-1',
    createdAt: new Date('2024-01-12'),
    msgTree: { $root: ['msg-4'] }
  },
  {
    id: 'dialog-5',
    name: 'API Integration Patterns',
    workspaceId: 'workspace-1',
    createdAt: new Date('2024-01-11'),
    msgTree: { $root: ['msg-5'] }
  }
]

const meta = {
  title: 'Components/DialogsExpansion',
  component: DialogsExpansion,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An expansion panel component that displays a list of dialogs with search functionality. Features a collapsible header with search button and contains DialogList and SearchDialog components.'
      }
    }
  },
  argTypes: {
    workspaceId: {
      control: 'text',
      description: 'The ID of the workspace containing the dialogs'
    }
  },
  args: {
    workspaceId: 'workspace-1'
  }
} satisfies Meta<typeof DialogsExpansion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  decorators: [vueRouter(routes)],
  parameters: {
    docs: {
      description: {
        story: 'Default state of the DialogsExpansion component with the expansion panel closed'
      }
    }
  },
  render: (args) => ({
    components: { DialogsExpansion },
    setup() {
      // Provide mocked dependencies
      provide('workspace', ref(mockWorkspace))
      provide('dialogs', ref(mockDialogs))

      // Mock the stores
      const mockStores = {
        useUserPerfsStore: () => mockUserPerfsStore,
        useListenKey: () => {},
        isPlatformEnabled: () => true
      }

      return {
        args,
        mockStores
      }
    },
    template: `
      <div style="width: 350px; padding: 20px; background: #1c1b1e; border-radius: 8px;">
        <DialogsExpansion v-bind="args" />
      </div>
    `
  })
}

export const EmptyDialogList: Story = {
  decorators: [vueRouter(routes)],
  parameters: {
    docs: {
      description: {
        story: 'DialogsExpansion component with no dialogs in the workspace'
      }
    }
  },
  render: (args) => ({
    components: { DialogsExpansion },
    setup() {
      // Provide mocked dependencies with empty dialogs
      provide('workspace', ref(mockWorkspace))
      provide('dialogs', ref([]))

      return {
        args
      }
    },
    template: `
      <div style="width: 350px; padding: 20px; background: #1c1b1e; border-radius: 8px;">
        <DialogsExpansion v-bind="args" />
        <script>
          // Force expansion panel to be open
          setTimeout(() => {
            const expansionItem = document.querySelector('.q-expansion-item');
            if (expansionItem && !expansionItem.classList.contains('q-expansion-item--expanded')) {
              const header = expansionItem.querySelector('.q-expansion-item__toggle-icon');
              if (header) header.click();
            }
          }, 100);
        </script>
      </div>
    `
  })
}
