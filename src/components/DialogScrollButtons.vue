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
      @click="scroll('top')"
    />
    <q-btn
      flat
      round
      dense
      icon="sym_o_keyboard_arrow_up"
      @click="scroll('up')"
    />
    <q-btn
      flat
      round
      dense
      icon="sym_o_keyboard_arrow_down"
      @click="scroll('down')"
    />
    <q-btn
      flat
      round
      dense
      icon="sym_o_last_page"
      rotate-90
      @click="scroll('bottom')"
    />
  </div>
</template>

<script setup lang="ts">
import { useUserPerfsStore } from 'src/stores/user-perfs'
import { isPlatformEnabled, almostEqual } from 'src/utils/functions'

const props = defineProps<{
  scrollContainer: HTMLElement | null
}>()

const { perfs } = useUserPerfsStore()

function getEls() {
  const container = props.scrollContainer
  const items: HTMLElement[] = Array.from(document.querySelectorAll('.message-item'))
  return { container, items }
}

function itemInView(item: HTMLElement, container: HTMLElement) {
  return item.offsetTop <= container.scrollTop + container.clientHeight &&
  item.offsetTop + item.clientHeight > container.scrollTop
}

function scroll(action: 'up' | 'down' | 'top' | 'bottom', behavior: 'smooth' | 'auto' = 'smooth') {
  const { container, items } = getEls()
  if (!container) return

  if (action === 'top') {
    container.scrollTo({ top: 0, behavior })
    return
  } else if (action === 'bottom') {
    container.scrollTo({ top: container.scrollHeight, behavior })
    return
  }

  // Get current position
  const index = items.findIndex(item => itemInView(item, container))
  if (index === -1) return

  const itemTypes = items.map(i => i.clientHeight > container.clientHeight ? 'partial' : 'entire')
  let position: 'start' | 'inner' | 'end' | 'out'
  const item = items[index]
  const type = itemTypes[index]
  if (type === 'partial') {
    if (almostEqual(container.scrollTop, item.offsetTop, 5)) {
      position = 'start'
    } else if (almostEqual(container.scrollTop + container.clientHeight, item.offsetTop + item.clientHeight, 5)) {
      position = 'end'
    } else if (container.scrollTop + container.clientHeight < item.offsetTop + item.clientHeight) {
      position = 'inner'
    } else {
      position = 'out'
    }
  } else {
    if (almostEqual(container.scrollTop, item.offsetTop, 5)) {
      position = 'start'
    } else {
      position = 'out'
    }
  }

  // Scroll
  let top
  if (type === 'entire') {
    if (action === 'up') {
      if (position === 'start') {
        if (index === 0) return
        top = itemTypes[index - 1] === 'entire'
          ? items[index - 1].offsetTop
          : items[index - 1].offsetTop + items[index - 1].clientHeight - container.clientHeight
      } else {
        top = item.offsetTop
      }
    } else {
      if (index === items.length - 1) return
      top = items[index + 1].offsetTop
    }
  } else {
    if (action === 'up') {
      if (position === 'start') {
        if (index === 0) return
        top = itemTypes[index - 1] === 'entire'
          ? items[index - 1].offsetTop
          : items[index - 1].offsetTop + items[index - 1].clientHeight - container.clientHeight
      } else if (position === 'out') {
        top = item.offsetTop + item.clientHeight - container.clientHeight
      } else {
        top = item.offsetTop
      }
    } else {
      if (position === 'end' || position === 'out') {
        if (index === items.length - 1) return
        top = items[index + 1].offsetTop
      } else {
        top = item.offsetTop + item.clientHeight - container.clientHeight
      }
    }
  }
  container.scrollTo({ top: top + 2, behavior: 'smooth' })
}
</script>
