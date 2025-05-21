<template>
  <view-common-header
    @toggle-drawer="$emit('toggle-drawer')"
    @contextmenu="$emit('create-dialog')"
  >
    <div>
      <assistant-item
        clickable
        :assistant="assistant"
        v-if="dialog"
        text-base
        item-rd
        py-1
        min-h-0
        @click="showAssistantMenu = true"
      />
      <q-menu v-model="showAssistantMenu">
        <q-list>
          <assistant-item
            clickable
            v-for="a in assistants"
            :key="a.id"
            :assistant="a"
            @click="handleAssistantUpdate(a.id)"
            v-close-popup
            py-1.5
            min-h-0
          />
        </q-list>
      </q-menu>
    </div>
    <div
      v-if="model && model.name"
      text-on-sur-var
      my-2
      of-hidden
      whitespace-nowrap
      text-ellipsis
      cursor-pointer
    >
      <q-icon
        name="sym_o_neurology"
        size="24px"
      />
      <code
        bg-sur-c-high
        px="6px"
        py="3px"
        text="xs"
      >{{ model.name }}</code>
      <q-menu important:max-w="300px">
        <q-list>
          <template v-if="assistant?.model">
            <q-item-label
              header
              pb-2
            >
              {{ $t('dialogView.assistantModel') }}
            </q-item-label>
            <model-item
              v-if="assistant.model"
              :model="assistant.model.name"
              @click="handleModelUpdate(null)"
              :selected="!dialog.modelOverride"
              clickable
              v-close-popup
            />
          </template>
          <template v-else-if="perfs.model">
            <q-item-label
              header
              pb-2
            >
              {{ $t('dialogView.globalDefault') }}
            </q-item-label>
            <model-item
              v-if="perfs.model"
              :model="perfs.model.name"
              @click="handleModelUpdate(null)"
              :selected="!dialog.modelOverride"
              clickable
              v-close-popup
            />
          </template>
          <q-separator spaced />
          <q-item-label
            header
            py-2
          >
            {{ $t('dialogView.commonModels') }}
          </q-item-label>
          <a-tip
            tip-key="configure-common-models"
            rd-0
          >
            {{ $t('dialogView.modelsConfigGuide1') }}<router-link
              to="/settings"
              pri-link
            >
              {{ $t('dialogView.settings') }}
            </router-link> {{ $t('dialogView.modelsConfigGuide2') }}
          </a-tip>
          <model-item
            v-for="m of perfs.commonModelOptions"
            :key="m"
            clickable
            :model="m"
            @click="handleModelUpdate(models.find(model => model.name === m) || { name: m, inputTypes: InputTypes.default })"
            :selected="dialog.modelOverride?.name === m"
            v-close-popup
          />
        </q-list>
      </q-menu>
    </div>
    <q-space />
    <slot />
  </view-common-header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAssistantsStore } from 'src/stores/assistants'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import AssistantItem from 'src/components/AssistantItem.vue'
import ModelItem from 'src/components/ModelItem.vue'
import ViewCommonHeader from 'src/components/ViewCommonHeader.vue'
import ATip from 'src/components/ATip.vue'
import { InputTypes, models } from 'src/utils/values'
import { Dialog, Workspace } from 'src/utils/types'

const props = defineProps<{
  assistant: any
  model: any | null
  dialog: Dialog
  workspace: Workspace
}>()

const emit = defineEmits(['toggle-drawer', 'create-dialog', 'update:assistant', 'update:model'])

const showAssistantMenu = ref(false)
const assistantsStore = useAssistantsStore()
const perfs = useUserPerfsStore().perfs

const assistants = computed(() => assistantsStore.assistants.filter(
  a => [props.workspace.id, '$root'].includes(a.workspaceId)
))

function handleAssistantUpdate(assistantId) {
  emit('update:assistant', assistantId)
}

function handleModelUpdate(modelOverride) {
  emit('update:model', modelOverride)
}
</script>
