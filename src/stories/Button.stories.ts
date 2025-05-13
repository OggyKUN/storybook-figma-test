import { fn } from '@storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3'

import BaseButton from './BaseButton.vue'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
  title: 'Example/Button',
  component: BaseButton,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['small', 'medium', 'large'] },
    backgroundColor: { control: 'color' }
  },
  args: {
    primary: false,
    // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
    onClick: fn()
  }
} satisfies Meta<typeof BaseButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button'
  }
}

export const Secondary: Story = {
  args: {
    primary: false,
    label: 'Button'
  }
}

export const Large: Story = {
  args: {
    label: 'Button',
    size: 'large'
  }
}

export const Small: Story = {
  args: {
    label: 'Button',
    size: 'small'
  }
}
