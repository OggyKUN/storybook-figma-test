<template>
  <div
    bg-sur-c-low
    p-2
    pos-relative
  >
    <div
      v-if="inputItems?.length"
      pos-absolute
      z-3
      top-0
      left-0
      translate-y="-100%"
      flex
      items-end
      p-2
      gap-2
    >
      <message-image
        v-for="image in inputItems.filter(i => i.mimeType?.startsWith('image/'))"
        :key="image.id"
        :image="image"
        removable
        h="100px"
        @remove="$emit('removeItem', image)"
        shadow
      />
      <message-file
        v-for="file in inputItems.filter(i => !i.mimeType?.startsWith('image/'))"
        :key="file.id"
        :file="file"
        removable
        @remove="$emit('removeItem', file)"
        shadow
      />
    </div>
    <div
      flex
      flex-wrap
      justify-end
      text-sec
      items-center
    >
      <q-btn
        v-if="model && mimeTypeMatch('image/webp', model.inputTypes.user)"
        flat
        icon="sym_o_image"
        :title="$t('dialogView.addImage')"
        round
        min-w="2.7em"
        min-h="2.7em"
        @click="imageInput.click()"
      >
        <input
          ref="imageInput"
          type="file"
          multiple
          accept="image/*"
          @change="onInputFiles"
          un-hidden
        >
      </q-btn>
      <q-btn
        flat
        icon="sym_o_folder"
        :title="$t('dialogView.addFile')"
        round
        min-w="2.7em"
        min-h="2.7em"
        @click="fileInput.click()"
      >
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="*"
          @change="onInputFiles"
          un-hidden
        >
      </q-btn>
      <q-btn
        v-if="assistant?.promptVars?.length"
        flat
        icon="sym_o_tune"
        :title="showVars ? $t('dialogView.hideVars') : $t('dialogView.showVars')"
        round
        min-w="2.7em"
        min-h="2.7em"
        @click="$emit('toggleVars')"
        :class="{ 'text-ter': showVars }"
      />
      <model-options-btn
        v-if="sdkModel"
        :provider-name="sdkModel.provider"
        :model-id="sdkModel.modelId"
        v-model="modelOptions"
        flat
        round
        min-w="2.7em"
        min-h="2.7em"
      />
      <add-info-btn
        :plugins="activePlugins"
        :assistant-plugins="assistant?.plugins || {}"
        @add="$emit('addInputItems', $event)"
        flat
        round
        min-w="2.7em"
        min-h="2.7em"
      />
      <q-btn
        v-if="assistant"
        flat
        :round="!activePlugins.length"
        :class="{ 'px-2': activePlugins.length }"
        min-w="2.7em"
        min-h="2.7em"
        icon="sym_o_extension"
        :title="$t('dialogView.plugins')"
      >
        <code
          v-if="activePlugins.length"
          bg-sur-c-high
          px="6px"
        >{{ activePlugins.length }}</code>
        <enable-plugins-menu :assistant-id="assistant.id" />
      </q-btn>
      <q-space />
      <div
        v-if="usage"
        my-2
        ml-2
      >
        <q-icon
          name="sym_o_generating_tokens"
          size="24px"
        />
        <code
          bg-sur-c-high
          px-2
          py-1
        >{{ usage.promptTokens }}+{{ usage.completionTokens }}</code>
        <q-tooltip>
          {{ $t('dialogView.messageTokens') }}<br>
          {{ $t('dialogView.tokenPrompt') }}：{{ usage.promptTokens }}，{{ $t('dialogView.tokenCompletion') }}：{{ usage.completionTokens }}
        </q-tooltip>
      </div>
      <abortable-btn
        icon="sym_o_send"
        :label="$t('dialogView.send')"
        @click="$emit('send')"
        @abort="$emit('abort')"
        :loading="loading"
        ml-4
        min-h="40px"
      />
    </div>
    <div
      flex
      v-if="assistant && promptVars.length"
      v-show="showVars"
    >
      <prompt-var-input
        class="mt-2 mr-2"
        v-for="promptVar of promptVars"
        :key="promptVar.id"
        :prompt-var="promptVar"
        v-model="promptVarsModelComputed[promptVar.name]"
        :input-props="{
          dense: true,
          outlined: true
        }"
        component="input"
      />
    </div>
    <a-input
      ref="messageInput"
      class="mt-2"
      max-h-50vh
      of-y-auto
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      outlined
      autogrow
      clearable
      :debounce="30"
      :placeholder="$t('dialogView.chatPlaceholder')"
      @keydown.enter="onEnter"
      @paste="onTextPaste"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { isPlatformEnabled, isTextFile, mimeTypeMatch, textBeginning, wrapCode } from 'src/utils/functions'
import { scaleBlob } from 'src/utils/image-process'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { MaxMessageFileSizeMB } from 'src/utils/config'
import MessageImage from 'src/components/MessageImage.vue'
import MessageFile from 'src/components/MessageFile.vue'
import PromptVarInput from 'src/components/PromptVarInput.vue'
import ModelOptionsBtn from 'src/components/ModelOptionsBtn.vue'
import AddInfoBtn from 'src/components/AddInfoBtn.vue'
import AbortableBtn from 'src/components/AbortableBtn.vue'
import EnablePluginsMenu from 'src/components/EnablePluginsMenu.vue'
import ParseFilesDialog from 'src/components/ParseFilesDialog.vue'
import { ApiResultItem, Plugin, StoredItem } from 'src/utils/types'

const { t } = useI18n()
const $q = useQuasar()
const { perfs } = useUserPerfsStore()

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  inputItems: {
    type: Array as () => StoredItem[],
    default: () => []
  },
  assistant: {
    type: Object,
    default: null
  },
  model: {
    type: Object,
    default: null
  },
  sdkModel: {
    type: Object,
    default: null
  },
  showVars: {
    type: Boolean,
    default: false
  },
  activePlugins: {
    type: Array as () => Plugin[],
    default: () => []
  },
  usage: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  promptVarsModel: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': []
  'abort': []
  'addInputItems': [items: ApiResultItem[]]
  'removeItem': [item: StoredItem]
  'toggleVars': []
  'update:promptVarsModel': [value: Record<string, any>]
}>()

const messageInput = ref()
const imageInput = ref()
const fileInput = ref()
const modelOptions = ref({})

const promptVars = computed(() => props.assistant?.promptVars || [])

const promptVarsModelComputed = computed({
  get: () => props.promptVarsModel,
  set: (val) => {
    emit('update:promptVarsModel', val)
  }
})

function onEnter(ev) {
  if (perfs.sendKey === 'ctrl+enter') {
    ev.ctrlKey && emit('send')
  } else if (perfs.sendKey === 'shift+enter') {
    ev.shiftKey && emit('send')
  } else {
    if (ev.ctrlKey) document.execCommand('insertText', false, '\n')
    else if (!ev.shiftKey) emit('send')
  }
}

function onTextPaste(ev: ClipboardEvent) {
  if (!isPlatformEnabled(perfs.codePasteOptimize ? 'always' : 'never')) return
  const { clipboardData } = ev
  const i = clipboardData.types.findIndex(t => t === 'vscode-editor-data')
  if (i !== -1) {
    const code = clipboardData.getData('text/plain')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
    if (!/\n/.test(code)) return
    const data = clipboardData.getData('vscode-editor-data')
    const lang = JSON.parse(data).mode ?? ''
    if (lang === 'markdown') return
    const wrappedCode = wrapCode(code, lang)
    document.execCommand('insertText', false, wrappedCode)
    ev.preventDefault()
  }
}

function onInputFiles({ target }) {
  const files = target.files
  parseFiles(Array.from(files))
  target.value = ''
}

function onPaste(ev: ClipboardEvent) {
  const { clipboardData } = ev
  if (clipboardData.types.includes('text/plain')) {
    if (
      !['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName) &&
      !['true', 'plaintext-only'].includes((document.activeElement as HTMLElement).contentEditable)
    ) {
      const text = clipboardData.getData('text/plain')
      emit('addInputItems', [{
        type: 'text',
        name: t('dialogView.pastedText', { text: textBeginning(text, 12) }),
        contentText: text
      }])
    }
    return
  }
  parseFiles(Array.from(clipboardData.files) as File[])
}

async function parseFiles(files: File[]) {
  if (!files.length) return
  const textFiles = []
  const supportedFiles = []
  const otherFiles = []
  for (const file of files) {
    if (await isTextFile(file)) textFiles.push(file)
    else if (mimeTypeMatch(file.type, props.model.inputTypes.user)) supportedFiles.push(file)
    else otherFiles.push(file)
  }

  const parsedFiles: ApiResultItem[] = []
  for (const file of textFiles) {
    parsedFiles.push({
      type: 'text',
      name: file.name,
      contentText: await file.text()
    })
  }
  for (const file of supportedFiles) {
    if (file.size > MaxMessageFileSizeMB * 1024 * 1024) {
      $q.notify({ message: t('dialogView.fileTooLarge', { maxSize: MaxMessageFileSizeMB }), color: 'negative' })
      continue
    }
    const f = file.type.startsWith('image/') && file.size > 512 * 1024 ? await scaleBlob(file, 2048 * 2048) : file
    parsedFiles.push({
      type: 'file',
      name: file.name,
      mimeType: file.type,
      contentBuffer: await f.arrayBuffer()
    })
  }
  emit('addInputItems', parsedFiles)

  otherFiles.length && $q.dialog({
    component: ParseFilesDialog,
    componentProps: { files: otherFiles, plugins: props.assistant.plugins }
  }).onOk((files: ApiResultItem[]) => {
    emit('addInputItems', files)
  })
}

onMounted(() => {
  addEventListener('paste', onPaste)
})

onUnmounted(() => {
  removeEventListener('paste', onPaste)
})

defineExpose({
  focus: () => messageInput.value?.focus()
})
</script>
