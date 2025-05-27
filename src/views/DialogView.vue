<template>
  <dialog-header
    v-if="dialog"
    :assistant="assistant"
    :model="model"
    :dialog="dialog"
    :workspace="workspace"
    @toggle-drawer="$emit('toggle-drawer')"
    @create-dialog="createDialog"
    @update:assistant="dialog.assistantId = $event"
    @update:model="dialog.modelOverride = $event"
  />
  <q-page-container
    bg-sur-c-low
    v-if="dialog"
  >
    <q-page
      flex
      flex-col
      :style-fn="pageFhStyle"
    >
      <div
        grow
        bg-sur
        of-y-auto
        py-4
        ref="scrollContainer"
        pos-relative
        :class="{ 'rd-r-lg': rightDrawerAbove }"
        @scroll="onScroll"
      >
        <template
          v-for="(i, index) in chain"
          :key="i"
        >
          <message-item
            class="message-item"
            v-if="messageMap[i] && i !== '$root'"
            :model-value="dialog.msgRoute[index - 1] + 1"
            :message="messageMap[i]"
            :child-num="dialog.msgTree[chain[index - 1]].length"
            :scroll-container
            @update:model-value="switchChain(index - 1, $event - 1)"
            @edit="edit(index)"
            @regenerate="regenerate(index)"
            @delete="deleteBranch(index)"
            @quote="quote"
            @extract-artifact="extractArtifact(messageMap[i], ...$event)"
            @rendered="messageMap[i].generatingSession && lockBottom()"
            pt-2
            pb-4
          />
        </template>
      </div>
      <div
        bg-sur-c-low
        p-2
        pos-relative
      >
        <DialogScrollButtons
          :scroll-container="scrollContainer"
          @switch-to="switchTo"
          @regenerate-curr="regenerateCurr"
          @edit-curr="editCurr"
          @focus-input="focusInput"
        />

        <MessageInput
          ref="messageInput"
          :model-value="inputMessageContent?.text"
          @update:model-value="inputMessageContent && updateInputText($event)"
          :input-items="inputContentItems"
          :assistant="assistant"
          :model="model"
          :sdk-model="sdkModel"
          :show-vars="showVars"
          :active-plugins="activePlugins"
          :usage="usage"
          :loading="!!messageMap[chain.at(-2)]?.generatingSession"
          :prompt-vars-model="dialog.inputVars"
          @update:prompt-vars-model="dialog.inputVars = $event"
          @send="send"
          @abort="abortController?.abort()"
          @add-input-items="addInputItems"
          @remove-item="removeItem"
          @toggle-vars="showVars = !showVars"
        />
      </div>
    </q-page>
  </q-page-container>
  <error-not-found v-else />
</template>

<script setup lang="ts">
import { computed, inject, provide, ref, Ref, toRaw, toRef, watch, nextTick } from 'vue'
import { db } from 'src/utils/db'
import { useLiveQueryWithDeps } from 'src/composables/live-query'
import { displayLength, genId, isPlatformEnabled, JSONEqual, mimeTypeMatch, pageFhStyle, wrapQuote } from 'src/utils/functions'
import { useAssistantsStore } from 'src/stores/assistants'
import { streamText, CoreMessage, generateText, tool, jsonSchema, StreamTextResult, GenerateTextResult } from 'ai'
import { throttle, useQuasar } from 'quasar'
import { DialogContent, ExtractArtifactPrompt, ExtractArtifactResult, GenDialogTitle, NameArtifactPrompt, PluginsPrompt } from 'src/utils/templates'
import sessions from 'src/utils/sessions'
import { MessageContent, PluginApi, ApiCallError, Plugin, Dialog, Message, Workspace, UserMessageContent, StoredItem, ModelSettings, ApiResultItem, Artifact, ConvertArtifactOptions, AssistantMessageContent } from 'src/utils/types'
import { usePluginsStore } from 'src/stores/plugins'
import MessageItem from 'src/components/MessageItem.vue'
import { engine } from 'src/utils/template-engine'
import { useCallApi } from 'src/composables/call-api'
import { until } from '@vueuse/core'
import { syncRef } from 'src/composables/sync-ref'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { dialogOptions } from 'src/utils/values'
import { useUserDataStore } from 'src/stores/user-data'
import ErrorNotFound from 'src/pages/ErrorNotFound.vue'
import { useRoute, useRouter } from 'vue-router'
import { useListenKey } from 'src/composables/listen-key'
import { useSetTitle } from 'src/composables/set-title'
import { useCreateArtifact } from 'src/composables/create-artifact'
import artifactsPlugin from 'src/utils/artifacts-plugin'
import { useI18n } from 'vue-i18n'
import Mark from 'mark.js'
import { useCreateDialog } from 'src/composables/create-dialog'
import { useGetModel } from 'src/composables/get-model'
import { useUiStateStore } from 'src/stores/ui-state'
import DialogHeader from 'src/components/DialogHeader.vue'
import MessageInput from 'src/components/MessageInput.vue'
import DialogScrollButtons from 'src/components/DialogScrollButtons.vue'

const { t, locale } = useI18n()

const props = defineProps<{
  id: string
}>()

const rightDrawerAbove = inject('rightDrawerAbove')

const dialogs: Ref<Dialog[]> = inject('dialogs')
const liveData = useLiveQueryWithDeps(() => props.id, async () => {
  const [dialog, messages, items] = await Promise.all([
    db.dialogs.get(props.id),
    db.messages.where('dialogId').equals(props.id).toArray(),
    db.items.where('dialogId').equals(props.id).toArray()
  ])
  return { dialog, messages, items }
}, { initialValue: { dialog: null, messages: [], items: [] } as { dialog: Dialog, messages: Message[], items: StoredItem[] } })
const dialog = syncRef<Dialog>(
  () => liveData.value.dialog,
  val => { db.dialogs.put(toRaw(val)) },
  { valueDeep: true }
)
const assistantsStore = useAssistantsStore()
const workspace: Ref<Workspace> = inject('workspace')
// Assistants list now handled in DialogHeader component
const assistant = computed(() => ({ ...assistantsStore.assistants.find(a => a.id === dialog.value?.assistantId) })) // force trigger updates
provide('dialog', dialog)

const chain = computed<string[]>(() => liveData.value.dialog ? getChain('$root', liveData.value.dialog.msgRoute)[0] : [])
const historyChain = ref<string[]>([])
function switchChain(index, value) {
  const route = [...dialog.value.msgRoute.slice(0, index), value]
  updateChain(route)
}
function updateChain(route) {
  const res = getChain('$root', route)
  historyChain.value = res[0]
  db.dialogs.update(dialog.value.id, { msgRoute: res[1] })
}
watch([() => liveData.value.messages.length, () => liveData.value.dialog?.id], () => {
  liveData.value.dialog && updateChain(liveData.value.dialog.msgRoute)
})
function getChain(node, route: number[]) {
  const children = liveData.value.dialog.msgTree[node]
  const r = route.at(0) || 0
  if (children[r]) {
    const [restChain, restRoute] = getChain(children[r], route.slice(1))
    return [[node, ...restChain], [r, ...restRoute]]
  } else {
    return [[node], [r]]
  }
}

const messageInput = ref()
function focusInput() {
  isPlatformEnabled(perfs.autoFocusDialogInput) && messageInput.value?.focus()
}
async function edit(index) {
  const target = chain.value[index - 1]
  const { type, contents } = messageMap.value[chain.value[index]]
  switchChain(index - 1, dialog.value.msgTree[target].length)
  await db.transaction('rw', db.dialogs, db.messages, db.items, () => {
    appendMessage(target, {
      type,
      contents,
      status: 'inputing'
    })
    const content = contents[0] as UserMessageContent
    saveItems(content.items.map(id => itemMap.value[id]))
  })
  await nextTick()
  focusInput()
}
async function regenerate(index) {
  if (!assistant.value) {
    $q.notify({ message: t('dialogView.errors.setAssistant'), color: 'negative' })
    return
  }
  if (!sdkModel.value) {
    $q.notify({ message: t('dialogView.errors.configModel'), color: 'negative' })
    return
  }
  const target = chain.value[index - 1]
  switchChain(index - 1, dialog.value.msgTree[target].length)
  await stream(target, false)
}
async function deleteBranch(index) {
  const parent = chain.value[index - 1]
  const anchor = chain.value[index]
  const branch = dialog.value.msgRoute[index - 1]
  branch === dialog.value.msgTree[parent].length - 1 && switchChain(index - 1, branch - 1)
  const ids = expandMessageTree(anchor)
  const itemIds = ids.flatMap(id => messageMap.value[id].contents).flatMap(c => {
    if (c.type === 'user-message') return c.items
    else if (c.type === 'assistant-tool') return c.result || []
    else return []
  })
  await db.transaction('rw', db.dialogs, db.messages, db.items, () => {
    db.messages.bulkDelete(ids)
    itemIds.forEach(id => {
      let { references } = itemMap.value[id]
      references--
      references === 0 ? db.items.delete(id) : db.items.update(id, { references })
    })
    const msgTree = { ...toRaw(dialog.value.msgTree) }
    msgTree[parent] = msgTree[parent].filter(id => id !== anchor)
    ids.forEach(id => {
      delete msgTree[id]
    })
    db.dialogs.update(props.id, { msgTree })
  })
}

async function appendMessage(target, info: Partial<Message>, insert = false) {
  const id = genId()
  await db.transaction('rw', db.dialogs, db.messages, async () => {
    await db.messages.add({
      id,
      dialogId: dialog.value.id,
      workspaceId: dialog.value.workspaceId,
      ...info
    } as Message)
    const d = await db.dialogs.get(props.id)
    const children = d.msgTree[target]
    const changes = insert ? {
      [target]: [id],
      [id]: children
    } : {
      [target]: [...children, id],
      [id]: []
    }
    await db.dialogs.update(props.id, {
      msgTree: { ...d.msgTree, ...changes }
    })
  })
  return id
}
function expandMessageTree(root): string[] {
  return [root, ...dialog.value.msgTree[root].flatMap(id => expandMessageTree(id))]
}

async function updateInputText(text) {
  await db.messages.update(chain.value.at(-1), {
    // use shallow keyPath to avoid dexie's sync bug
    contents: [{
      ...inputMessageContent.value,
      text
    }]
  })
}

const inputMessageContent = computed(() => messageMap.value[chain.value.at(-1)]?.contents[0] as UserMessageContent)
const inputContentItems = computed(() => inputMessageContent.value.items.map(id => itemMap.value[id]).filter(x => x))
const messageMap = computed<Record<string, Message>>(() => {
  const map = {}
  liveData.value.messages.forEach(m => { map[m.id] = m })
  return map
})
const itemMap = computed<Record<string, StoredItem>>(() => {
  const map = {}
  liveData.value.items.forEach(i => { map[i.id] = i })
  return map
})
provide('messageMap', messageMap)
provide('itemMap', itemMap)
const inputEmpty = computed(() => !inputMessageContent.value?.text && !inputMessageContent.value?.items.length)

async function removeItem({ id, references }: StoredItem) {
  const items = [...inputMessageContent.value.items]
  items.splice(items.indexOf(id), 1)
  await db.transaction('rw', db.messages, db.items, () => {
    db.messages.update(chain.value.at(-1), {
      contents: [{
        ...inputMessageContent.value,
        items
      }]
    })
    references--
    references === 0 ? db.items.delete(id) : db.items.update(id, { references })
  })
}

function quote(item: ApiResultItem) {
  if (displayLength(item.contentText) > 200) {
    addInputItems([item])
  } else {
    const { text } = inputMessageContent.value
    const content = wrapQuote(item.contentText) + '\n\n'
    updateInputText(text ? text + '\n' + content : content)
    focusInput()
  }
}
async function addInputItems(items: ApiResultItem[]) {
  const storedItems = items.map(i => ({ ...i, id: genId(), dialogId: props.id, references: 0 }))
  const ids = storedItems.map(i => i.id)
  await db.transaction('rw', db.messages, db.items, () => {
    db.messages.update(chain.value.at(-1), {
      // use shallow keyPath to avoid dexie's sync bug
      contents: [{
        ...inputMessageContent.value,
        items: [...inputMessageContent.value.items, ...ids]
      }]
    })
    saveItems(storedItems)
  })
}

async function saveItems(items: StoredItem[]) {
  items.forEach(i => {
    i.references++
  })
  await db.items.bulkPut(items)
}

function getChainMessages() {
  const val: CoreMessage[] = []
  historyChain.value
    .slice(1)
    .slice(-assistant.value.contextNum || 0)
    .filter(id => messageMap.value[id].status !== 'inputing')
    .map(id => messageMap.value[id].contents)
    .flat()
    .forEach(content => {
      if (content.type === 'user-message') {
        val.push({
          role: 'user',
          content: [
            { type: 'text', text: content.text },
            ...content.items.map(id => itemMap.value[id]).map(i => {
              if (i.contentText != null) {
                if (i.type === 'file') {
                  return { type: 'text' as const, text: `<file_content filename="${i.name}">\n${i.contentText}\n</file_content>` }
                } else if (i.type === 'quote') {
                  return { type: 'text' as const, text: `<quote name="${i.name}">${i.contentText}</quote>` }
                } else {
                  return { type: 'text' as const, text: i.contentText }
                }
              } else {
                if (!mimeTypeMatch(i.mimeType, model.value.inputTypes.user)) {
                  return null
                } else if (i.mimeType.startsWith('image/')) {
                  return { type: 'image' as const, image: i.contentBuffer, mimeType: i.mimeType }
                } else {
                  return { type: 'file' as const, mimeType: i.mimeType, data: i.contentBuffer }
                }
              }
            }).filter(x => x)
          ]
        })
      } else if (content.type === 'assistant-message') {
        val.push({
          role: 'assistant',
          content: [
            { type: 'text', text: content.text }
          ]
        })
      } else if (content.type === 'assistant-tool') {
        if (content.status !== 'completed') return
        const { name, args, result, pluginId } = content
        const id = genId()
        val.push({
          role: 'assistant',
          content: [{
            type: 'tool-call',
            toolName: `${pluginId}-${name}`,
            toolCallId: id,
            args
          }]
        })
        val.push({
          role: 'tool',
          content: [{
            type: 'tool-result',
            toolName: `${pluginId}-${name}`,
            toolCallId: id,
            result: toToolResultContent(result.map(id => itemMap.value[id])),
            experimental_content: toToolResultContent(result.map(id => itemMap.value[id]))
          }]
        })
      }
    })
  return val
}

function getSystemPrompt(enabledPlugins) {
  try {
    const prompt = engine.parseAndRenderSync(assistant.value.promptTemplate, {
      ...getCommonVars(),
      ...workspace.value.vars,
      ...dialog.value.inputVars,
      _pluginsPrompt: enabledPlugins.length
        ? engine.parseAndRenderSync(PluginsPrompt, { plugins: enabledPlugins })
        : '',
      _rolePrompt: assistant.value.prompt
    })
    return prompt.trim() ? prompt : undefined
  } catch (e) {
    console.error(e)
    $q.notify({ message: t('dialogView.promptParseFailed'), color: 'negative' })
    throw e
  }
}

function getCommonVars() {
  return {
    _currentTime: new Date().toString(),
    _userLanguage: navigator.language,
    _workspaceId: workspace.value.id,
    _workspaceName: workspace.value.name,
    _assistantId: assistant.value.id,
    _assistantName: assistant.value.name,
    _dialogId: dialog.value.id,
    _modelId: model.value.name,
    _isDarkMode: $q.dark.isActive,
    _platform: $q.platform
  }
}

const pluginsStore = usePluginsStore()

const { callApi } = useCallApi({ workspace, dialog })

const modelOptions = ref({})
const { getModel, getSdkModel } = useGetModel()
const model = computed(() => getModel(dialog.value?.modelOverride || assistant.value?.model))
const sdkModel = computed(() => getSdkModel(assistant.value?.provider, model.value, modelOptions.value))
const $q = useQuasar()
const { data } = useUserDataStore()
async function send() {
  if (!assistant.value) {
    $q.notify({ message: t('dialogView.errors.setAssistant'), color: 'negative' })
    return
  }
  if (!sdkModel.value) {
    $q.notify({ message: t('dialogView.errors.configModel'), color: 'negative' })
    return
  }
  if (!data.noobAlertDismissed && chain.value.length > 10 && dialogs.value.length < 3) {
    $q.dialog({
      title: t('dialogView.noobAlert.title'),
      message: t('dialogView.noobAlert.message'),
      persistent: true,
      ok: t('dialogView.noobAlert.okBtn'),
      cancel: t('dialogView.noobAlert.cancelBtn'),
      ...dialogOptions
    }).onCancel(() => {
      data.noobAlertDismissed = true
      send()
    })
    return
  }
  showVars.value = false
  if (inputEmpty.value) {
    await stream(chain.value.at(-2), true)
  } else {
    const target = chain.value.at(-1)
    await db.messages.update(target, { status: 'default' })
    until(chain).changed().then(() => {
      nextTick().then(() => {
        scrollContainer.value?.scrollTo({ top: scrollContainer.value.scrollHeight, behavior: 'smooth' })
      })
    })
    await stream(target, false)
  }
  perfs.autoGenTitle && chain.value.length === 4 && genTitle()
}

const artifacts = inject<Ref<Artifact[]>>('artifacts')
const abortController = ref<AbortController>()
async function stream(target, insert = false) {
  const settings: Partial<ModelSettings> = {}
  for (const key in assistant.value.modelSettings) {
    const val = assistant.value.modelSettings[key]
    if (val || val === 0) {
      settings[key] = val
    }
  }
  const messageContent: AssistantMessageContent = {
    type: 'assistant-message',
    text: ''
  }
  const contents: MessageContent[] = [messageContent]
  let id
  await db.transaction('rw', db.dialogs, db.messages, async () => {
    id = await appendMessage(target, {
      type: 'assistant',
      assistantId: assistant.value.id,
      contents,
      status: 'pending',
      generatingSession: sessions.id,
      modelName: model.value.name
    }, insert)
    !insert && await appendMessage(id, {
      type: 'user',
      contents: [{
        type: 'user-message',
        text: '',
        items: []
      }],
      status: 'inputing'
    })
  })

  const update = throttle(() => db.messages.update(id, { contents }), 50)
  async function callTool(plugin: Plugin, api: PluginApi, args) {
    const content: MessageContent = {
      type: 'assistant-tool',
      pluginId: plugin.id,
      name: api.name,
      args,
      status: 'calling'
    }
    contents.push(content)
    update()
    const { result: apiResult, error } = await callApi(plugin, api, args)
    const result: StoredItem[] = apiResult.map(r => ({ ...r, id: genId(), dialogId: props.id, references: 0 }))
    saveItems(result)
    if (error) {
      content.status = 'failed'
      content.error = error
    } else {
      content.status = 'completed'
      content.result = result.map(i => i.id)
    }
    update()
    return { result, error }
  }
  const { plugins } = assistant.value
  const tools = {}
  const enabledPlugins = []
  let noRoundtrip = true
  await Promise.all(activePlugins.value.map(async p => {
    noRoundtrip &&= p.noRoundtrip
    const plugin = plugins[p.id]
    const pluginVars = {
      ...getCommonVars(),
      ...plugin.vars
    }
    plugin.tools.forEach(api => {
      if (!api.enabled) return
      const a = p.apis.find(a => a.name === api.name)
      const { name, prompt } = a
      tools[`${p.id}-${name}`] = tool({
        description: engine.parseAndRenderSync(prompt, pluginVars),
        parameters: jsonSchema(a.parameters),
        async execute(args) {
          const { result, error } = await callTool(p, a, args)
          if (error) throw new ApiCallError(error)
          return result
        },
        experimental_toToolResultContent: toToolResultContent
      })
    })
    const pluginInfos = {}
    await Promise.all(plugin.infos.map(async api => {
      if (!api.enabled) return
      const a = p.apis.find(a => a.name === api.name)
      if (a.infoType !== 'prompt-var') return
      try {
        pluginInfos[a.name] = await callApi(p, a, api.args)
      } catch (e) {
        $q.notify({ message: t('dialogView.callPluginInfoFailed', { message: e.message }), color: 'negative' })
      }
    }))

    try {
      enabledPlugins.push({
        id: p.id,
        prompt: p.prompt && engine.parseAndRenderSync(p.prompt, { ...pluginVars, infos: pluginInfos })
      })
    } catch (e) {
      $q.notify({ message: t('dialogView.pluginPromptParseFailed', { title: p.title }), color: 'negative' })
    }
  }))
  if (isPlatformEnabled(perfs.artifactsEnabled) && artifacts.value.some(a => a.open)) {
    const { plugin, getPrompt, api } = artifactsPlugin
    enabledPlugins.push({
      id: plugin.id,
      prompt: getPrompt(artifacts.value.filter(a => a.open)),
      actions: []
    })
    tools[`${plugin.id}-${api.name}`] = tool({
      description: api.prompt,
      parameters: jsonSchema(api.parameters),
      async execute(args) {
        const { result, error } = await callTool(plugin, api, args)
        if (error) throw new ApiCallError(error)
        return result
      },
      experimental_toToolResultContent: toToolResultContent
    })
  }
  try {
    if (noRoundtrip) settings.maxSteps = 1
    abortController.value = new AbortController()
    const messages = getChainMessages()
    const prompt = getSystemPrompt(enabledPlugins.filter(p => p.prompt))
    prompt && messages.unshift({ role: assistant.value.promptRole, content: prompt })
    const params = {
      model: sdkModel.value,
      messages,
      tools,
      ...settings,
      abortSignal: abortController.value.signal
    }
    let result: StreamTextResult<any, any> | GenerateTextResult<any, any>
    if (assistant.value.stream) {
      result = streamText(params)
      await db.messages.update(id, { status: 'streaming' })
      lockingBottom.value = perfs.streamingLockBottom
      for await (const part of result.fullStream) {
        if (part.type === 'text-delta') {
          messageContent.text += part.textDelta
          update()
        } else if (part.type === 'reasoning') {
          messageContent.reasoning = (messageContent.reasoning ?? '') + part.textDelta
          update()
        } else if (part.type === 'error') {
          throw part.error
        }
      }
    } else {
      result = await generateText(params)
      messageContent.text = await result.text
      messageContent.reasoning = await result.reasoning
    }

    const usage = await result.usage
    const warnings = (await result.warnings).map(w => (w.type === 'unsupported-setting' || w.type === 'unsupported-tool') ? w.details : w.message)
    await db.messages.update(id, { contents, status: 'default', generatingSession: null, warnings, usage })
  } catch (e) {
    console.error(e)
    if (e.data?.error?.type === 'budget_exceeded') {
      $q.notify({
        message: t('dialogView.errors.insufficientQuota'),
        color: 'err-c',
        textColor: 'on-err-c',
        actions: [{ label: t('dialogView.recharge'), color: 'on-sur', handler() { router.push('/account') } }]
      })
    }
    await db.messages.update(id, { contents, error: e.message || e.toString(), status: 'failed', generatingSession: null })
  }
  perfs.artifactsAutoExtract && autoExtractArtifact()
  lockingBottom.value = false
}
function toToolResultContent(items: StoredItem[]) {
  const val = []
  for (const item of items) {
    if (item.type === 'text') {
      val.push({ type: 'text', text: item.contentText })
    } else if (mimeTypeMatch(item.mimeType, model.value.inputTypes.tool)) {
      val.push({ type: item.mimeType.startsWith('image/') ? 'image' : 'file', mimeType: item.mimeType, data: item.contentBuffer })
    }
  }
  return val
}
const lockingBottom = ref(false)
let lastScrollTop
function scrollListener() {
  const container = scrollContainer.value
  if (container.scrollTop < lastScrollTop) {
    lockingBottom.value = false
  }
  lastScrollTop = container.scrollTop
}
function lockBottom() {
  if (lockingBottom.value && scrollContainer.value) {
    scrollContainer.value.scrollTo({
      top: scrollContainer.value.scrollHeight,
      behavior: 'auto'
    })
  }
}
watch(lockingBottom, val => {
  if (val) {
    lastScrollTop = scrollContainer.value.scrollTop
    scrollContainer.value.addEventListener('scroll', scrollListener)
  } else {
    lastScrollTop = null
    scrollContainer.value.removeEventListener('scroll', scrollListener)
  }
})
const activePlugins = computed<Plugin[]>(() => pluginsStore.plugins.filter(p => p.available && assistant.value.plugins[p.id]?.enabled))
const usage = computed(() => messageMap.value[chain.value.at(-2)]?.usage)

const systemSdkModel = computed(() => getSdkModel(perfs.systemProvider, perfs.systemModel))
function getDialogContents() {
  return chain.value.slice(1, -1).map(id => messageMap.value[id].contents).flat()
}
async function genTitle() {
  try {
    const dialogId = props.id
    const { text } = await generateText({
      model: systemSdkModel.value,
      prompt: await engine.parseAndRender(GenDialogTitle, {
        contents: getDialogContents(),
        lang: locale.value
      })
    })
    await db.dialogs.update(dialogId, { name: text })
  } catch (e) {
    console.error(e)
    $q.notify({ message: t('dialogView.summarizeFailed'), color: 'negative' })
  }
}
async function copyContent() {
  await navigator.clipboard.writeText(await engine.parseAndRender(DialogContent, {
    contents: getDialogContents(),
    title: dialog.value.name
  }))
}
const route = useRoute()
const router = useRouter()
watch(route, to => {
  db.workspaces.update(workspace.value.id, { lastDialogId: props.id } as Partial<Workspace>)

  until(dialog).toMatch(val => val?.id === props.id).then(async () => {
    focusInput()
    if (to.hash === '#genTitle') {
      genTitle()
      router.replace({ hash: '' })
    } else if (to.hash === '#copyContent') {
      copyContent()
      router.replace({ hash: '' })
    }
    if (to.query.goto) {
      const { route, highlight } = JSON.parse(to.query.goto as string)
      if (!JSONEqual(route, dialog.value.msgRoute.slice(0, route.length))) {
        updateChain(route)
        await until(chain).changed()
      }
      await nextTick()
      const items: HTMLElement[] = Array.from(document.querySelectorAll('.message-item'))
      const item = items[route.length - 1]
      if (highlight) {
        const mark = new Mark(item)
        mark.unmark()
        mark.mark(highlight)
      }
      item.querySelector('mark[data-markjs]')?.scrollIntoView()
      router.replace({ query: {} })
    }
  })
}, { immediate: true })

const showVars = ref(true)

const scrollContainer = ref<HTMLElement>()

function switchTo(target: 'prev' | 'next' | 'first' | 'last') {
  const items: HTMLElement[] = Array.from(document.querySelectorAll('.message-item'))
  const container = scrollContainer.value
  if (!container) return

  const index = items.findIndex((item, i) => {
    const isVisible = item.offsetTop <= container.scrollTop + container.clientHeight &&
                      item.offsetTop + item.clientHeight > container.scrollTop
    return isVisible && dialog.value.msgTree[chain.value[i]].length > 1
  })
  if (index === -1) return

  const id = chain.value[index]
  let to
  const curr = dialog.value.msgRoute[index]
  const num = dialog.value.msgTree[id].length
  if (target === 'first') {
    to = 0
  } else if (target === 'last') {
    to = num - 1
  } else if (target === 'prev') {
    to = curr - 1
  } else if (target === 'next') {
    to = curr + 1
  }
  if (to < 0 || to >= num || to === curr) return
  switchChain(index, to)
}

function regenerateCurr() {
  const container = scrollContainer.value
  if (!container) return

  const items: HTMLElement[] = Array.from(document.querySelectorAll('.message-item'))
  const index = items.findIndex(
    (item, i) => {
      const isVisible = item.offsetTop <= container.scrollTop + container.clientHeight &&
                        item.offsetTop + item.clientHeight > container.scrollTop
      return isVisible && messageMap.value[chain.value[i + 1]].type === 'assistant'
    }
  )
  if (index === -1) return
  regenerate(index + 1)
}

function editCurr() {
  const container = scrollContainer.value
  if (!container) return

  const items: HTMLElement[] = Array.from(document.querySelectorAll('.message-item'))
  const index = items.findIndex(
    (item, i) => {
      const isVisible = item.offsetTop <= container.scrollTop + container.clientHeight &&
                        item.offsetTop + item.clientHeight > container.scrollTop
      return isVisible && messageMap.value[chain.value[i + 1]].type === 'user'
    }
  )
  if (index === -1) return
  edit(index + 1)
}
const { perfs } = useUserPerfsStore()

async function genArtifactName(content: string, lang?: string) {
  const { text } = await generateText({
    model: systemSdkModel.value,
    prompt: engine.parseAndRenderSync(NameArtifactPrompt, { content, lang })
  })
  return text
}
const { createArtifact } = useCreateArtifact(workspace)
async function extractArtifact(message: Message, text: string, pattern, options: ConvertArtifactOptions) {
  const name = options.name || await genArtifactName(text, options.lang)
  const id = await createArtifact({
    name,
    language: options.lang,
    versions: [{
      date: new Date(),
      text
    }],
    tmp: text
  })
  if (options.reserveOriginal) return
  const to = `> ${t('dialogView.convertedToArtifact')}: <router-link to="?openArtifact=${id}">${name}</router-link>\n`
  const index = message.contents.findIndex(c => ['assistant-message', 'user-message'].includes(c.type))
  const content = message.contents[index] as UserMessageContent | AssistantMessageContent
  await db.messages.update(message.id, {
    [`contents.${index}.text`]: content.text.replace(pattern, to) as any
  })
}
async function autoExtractArtifact() {
  const message = messageMap.value[chain.value.at(-2)]
  const { text } = await generateText({
    model: systemSdkModel.value,
    prompt: engine.parseAndRenderSync(ExtractArtifactPrompt, {
      contents: chain.value.slice(-3, -1).map(id => messageMap.value[id].contents).flat()
    })
  })
  const object: ExtractArtifactResult = JSON.parse(text)
  if (!object.found) return
  const reg = new RegExp(`(\`{3,}.*\\n)?(${object.regex})(\\s*\`{3,})?`)
  const content = message.contents.find(c => c.type === 'assistant-message')
  const match = content.text.match(reg)
  if (!match) return
  await extractArtifact(message, match[2], reg, {
    name: object.name,
    lang: object.language,
    reserveOriginal: perfs.artifactsReserveOriginal
  })
}

const uiStateStore = useUiStateStore()
const scrollTops = uiStateStore.dialogScrollTops
function onScroll(ev) {
  scrollTops[props.id] = ev.target.scrollTop
}
watch(() => liveData.value.dialog?.id, id => {
  if (!id) return
  nextTick(() => {
    scrollContainer.value?.scrollTo({ top: scrollTops[id] ?? 0 })
  })
})

const { createDialog } = useCreateDialog(workspace)

defineEmits(['toggle-drawer'])

useSetTitle(computed(() => dialog.value?.name))
</script>
