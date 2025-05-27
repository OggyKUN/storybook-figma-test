<template>
  <div
    v-if="isPlatformEnabled(perfs.dialogScrollBtn)"
    pos-absolute
    top--1
    right-2
    flex="~ col"
    text-sec
    translate-y="-100%"
    z-1
  >
    <q-btn
      flat
      round
      dense
      icon="sym_o_first_page"
      rotate-90
      :title="t('shortcutKeysView.scrollToTop')"
      @click="scrollToTop"
    />
    <q-btn
      flat
      round
      dense
      icon="sym_o_keyboard_arrow_up"
      :title="t('shortcutKeysView.scrollUp')"
      @click="scrollUp"
    />
    <q-btn
      flat
      round
      dense
      icon="sym_o_keyboard_arrow_down"
      :title="t('shortcutKeysView.scrollDown')"
      @click="scrollDown"
    />
    <q-btn
      flat
      round
      dense
      icon="sym_o_last_page"
      rotate-90
      :title="t('shortcutKeysView.scrollToBottom')"
      @click="scrollToBottom"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { useListenKey } from 'src/composables/listen-key'
import { isPlatformEnabled } from 'src/utils/functions'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { perfs } = useUserPerfsStore()

const props = defineProps<{
  scrollContainer: HTMLElement | null
}>()

const emit = defineEmits<{
  switchTo: [target: 'prev' | 'next' | 'first' | 'last']
  regenerateCurr: []
  editCurr: []
  focusInput: []
}>()

// Basic scroll functions
function scrollToTop() {
  props.scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrollToBottom() {
  props.scrollContainer?.scrollTo({
    top: props.scrollContainer.scrollHeight,
    behavior: 'smooth'
  })
}

function scrollUp() {
  if (!props.scrollContainer) return

  const container = props.scrollContainer
  const items: HTMLElement[] = Array.from(document.querySelectorAll('.message-item'))
  const visibleIndex = items.findIndex(item =>
    item.offsetTop > container.scrollTop &&
    item.offsetTop < container.scrollTop + container.clientHeight
  )
  if (visibleIndex > 0) {
    container.scrollTo({ top: items[visibleIndex - 1].offsetTop, behavior: 'smooth' })
  }
}

function scrollDown() {
  if (!props.scrollContainer) return

  const container = props.scrollContainer
  const items: HTMLElement[] = Array.from(document.querySelectorAll('.message-item'))
  const visibleIndex = items.findIndex(item =>
    item.offsetTop > container.scrollTop &&
    item.offsetTop < container.scrollTop + container.clientHeight
  )
  if (visibleIndex !== -1 && visibleIndex < items.length - 1) {
    container.scrollTo({ top: items[visibleIndex + 1].offsetTop, behavior: 'smooth' })
  }
}

// Keyboard shortcuts
if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, 'scrollUpKeyV2'), scrollUp)
  useListenKey(toRef(perfs, 'scrollDownKeyV2'), scrollDown)
  useListenKey(toRef(perfs, 'scrollTopKey'), scrollToTop)
  useListenKey(toRef(perfs, 'scrollBottomKey'), scrollToBottom)
  useListenKey(toRef(perfs, 'switchPrevKeyV2'), () => emit('switchTo', 'prev'))
  useListenKey(toRef(perfs, 'switchNextKeyV2'), () => emit('switchTo', 'next'))
  useListenKey(toRef(perfs, 'switchFirstKey'), () => emit('switchTo', 'first'))
  useListenKey(toRef(perfs, 'switchLastKey'), () => emit('switchTo', 'last'))
  useListenKey(toRef(perfs, 'regenerateCurrKey'), () => emit('regenerateCurr'))
  useListenKey(toRef(perfs, 'editCurrKey'), () => emit('editCurr'))
  useListenKey(toRef(perfs, 'focusDialogInputKey'), () => emit('focusInput'))
}
</script>
