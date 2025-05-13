<template>
  <button
    type="button"
    :class="classes"
    @click="onClick"
    :style="style"
  >
    {{ label }}
  </button>
</template>

<script lang="ts" setup>
import './button.css'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /**
   * Is this the principal call to action on the page?
   */
  primary?: boolean,
  /**
   * What background color to use
   */
  backgroundColor?: string,
  /**
   * How large should the button be?
   */
  size?: 'small' | 'medium' | 'large',
  /**
   * Button contents
   */
  label: string
}>(), {
  primary: false,
  size: 'medium',
  backgroundColor: undefined
})

const emit = defineEmits<(e: 'click', id: number) => void>()

const classes = computed(() => ({
  'storybook-button': true,
  'storybook-button--primary': props.primary,
  'storybook-button--secondary': !props.primary,
  [`storybook-button--${props.size}`]: true
}))

const style = computed(() => ({
  backgroundColor: props.backgroundColor
}))

const onClick = () => {
  emit('click', 1)
}
</script>
