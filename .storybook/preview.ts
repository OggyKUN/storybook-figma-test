import type { Preview } from "@storybook/vue3";
import { setup } from "@storybook/vue3";
import { Quasar, Dialog, Notify, Loading, Dark } from "quasar";
import { createPinia } from "pinia";
import { createI18n } from "vue-i18n";
import { useSetTheme } from "../src/composables/set-theme";
import { useUserPerfsStore } from "../src/stores/user-perfs";
import { useUiStateStore } from "../src/stores/ui-state";
import { onMounted, nextTick } from "vue";
import "@quasar/extras/material-icons/material-icons.css";
import "@quasar/extras/material-symbols-outlined/material-symbols-outlined.css";
import "@quasar/extras/roboto-font/roboto-font.css";
import "quasar/dist/quasar.css";
import "../src/css/app.scss";
import "uno.css";

// Import global components
import AInput from "../src/components/global/AInput.js";
import VarsInput from "../src/components/VarsInput.vue";

// Define translations for use in stories
const messages = {
  en: {
    "dialogView.addImage": "Add Image",
    "dialogView.addFile": "Add File",
    "dialogView.hideVars": "Hide Variables",
    "dialogView.showVars": "Show Variables",
    "dialogView.messageTokens": "Message Tokens",
    "dialogView.tokenPrompt": "Prompt Tokens",
    "dialogView.tokenCompletion": "Completion Tokens",
    "abortableBtn.stop": "Stop",
    "shortcutKeysView.scrollUp": "Scroll Up",
    "shortcutKeysView.scrollDown": "Scroll Down",
    "shortcutKeysView.scrollToTop": "Scroll to Top",
    "shortcutKeysView.scrollToBottom": "Scroll to Bottom",
    "messageItem.more": "More",
    "messageItem.showSourceCode": "Source Code",
    "messageItem.directEdit": "Direct Edit",
    "messageItem.quote": "Quote",
    "messageItem.moreInfo": "More Info",
    "dialogsExpansion.search": "Search Dialogs...",
    "dialogsExpansion.dialogs": "Dialogs",
    "dialogList.createDialog": "Create Dialog",
    "searchDialog.placeholder": "Search Messages...",
    "searchDialog.noResults": "No results found...",
    "searchDialog.workspace": "Workspace",
    "searchDialog.global": "Global",
    "workspaceSettings.title": "Workspace Settings",
    "workspaceSettings.defaultAssistant": "Default Assistant",
    "workspaceSettings.avatar": "Workspace Icon",
    "workspaceSettings.homeContent": "Home Content",
    "workspaceSettings.variables": "Workspace Variables",
    "workspaceSettings.inputPlaceholder": "Enter variable content...",
    "assistantItem.unselected": "No assistant selected",
    "assistantItem.global": "Global",
    "varsInput.addVariable": "Add Variable",
    "varsInput.variableName": "Variable Name"
  },
};

// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: "en",
  messages,
});

setup((app) => {
  const pinia = createPinia();
  app.use(pinia);
  app.use(i18n);
  app.use(Quasar, {
    plugins: {
      Dialog,
      Notify,
      Loading,
      Dark,
    },
    config: {
      dark: true,
    },
  });

  // Register global components
  app.component('AInput', AInput);
  app.component('VarsInput', VarsInput);

  if (!window.indexedDB) {
    const mockDB = {
      reactives: {
        get: () => Promise.resolve(null),
        put: () => Promise.resolve(),
        add: () => Promise.resolve()
      }
    };
    (window as any).__STORYBOOK_DB_MOCK__ = mockDB;
  }

  // Mock stores for components that need them
  app.provide('userPerfs', {
    dialogScrollBtn: true,
    enableShortcutKey: true,
    scrollUpKeyV2: 'ArrowUp',
    scrollDownKeyV2: 'ArrowDown',
    scrollTopKey: 'Home',
    scrollBottomKey: 'End',
    switchPrevKeyV2: 'ArrowLeft',
    switchNextKeyV2: 'ArrowRight',
    switchFirstKey: 'Home',
    switchLastKey: 'End',
    regenerateCurrKey: 'r',
    editCurrKey: 'e',
    focusDialogInputKey: 'f'
  });
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (story, context) => ({
      components: { story },
      template: '<div class="q-pa-md"><story /></div>',
      setup() {
        // Initialize stores for Storybook
        const userPerfsStore = useUserPerfsStore();
        const uiStateStore = useUiStateStore();

        // Force light theme for all stories
        Dark.set(false);

        onMounted(async () => {
          await nextTick();

          // Ensure user preferences are set to light mode
          if (userPerfsStore.perfs) {
            userPerfsStore.perfs.darkMode = false;
          }

          // Force light theme in DOM
          document.body.classList.remove('body--dark');
          document.documentElement.classList.remove('dark');

          try {
            useSetTheme();
          } catch (error) {
            console.error('Theme initialization failed in Storybook:', error);
          }
        });

        return {};
      },
    }),
  ],
};

export default preview;
