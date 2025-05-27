import type { Meta, StoryObj } from '@storybook/vue3'
import { defineComponent, onMounted, ref } from 'vue'

const ThemeTestComponent = defineComponent({
  name: 'ThemeTest',
  setup() {
    const themeStatus = ref('Loading...')
    const themeColors = ref<Record<string, string>>({})

    onMounted(() => {
      // Check if theme variables are set
      const computedStyle = getComputedStyle(document.documentElement)
      const colors = [
        'pri', 'sec', 'ter', 'err', 'suc', 'warn',
        'on-pri', 'on-sec', 'on-ter', 'on-err',
        'sur', 'sur-c', 'on-sur', 'out'
      ]

      const foundColors: Record<string, string> = {}
      let hasColors = false

      colors.forEach(color => {
        const value = computedStyle.getPropertyValue(`--a-${color}`).trim()
        if (value) {
          foundColors[color] = value
          hasColors = true
        }
      })

      themeColors.value = foundColors
      themeStatus.value = hasColors ? 'Theme loaded successfully!' : 'Theme variables not found'
    })

    return { themeStatus, themeColors }
  },
  template: `
    <div class="q-pa-md">
      <h3>Theme Test Component</h3>
      <p><strong>Status:</strong> {{ themeStatus }}</p>

      <div v-if="Object.keys(themeColors).length > 0" class="q-mt-md">
        <h4>Available Theme Colors:</h4>
        <div class="q-gutter-sm">
          <div
            v-for="(value, key) in themeColors"
            :key="key"
            class="q-pa-sm"
            :style="{
              background: value,
              color: themeColors['on-' + key] || '#000',
              borderRadius: '4px',
              display: 'inline-block',
              margin: '4px',
              minWidth: '120px',
              textAlign: 'center'
            }"
          >
            --a-{{ key }}<br>
            <small>{{ value }}</small>
          </div>
        </div>
      </div>

      <div class="q-mt-md q-gutter-md">
        <div class="q-pa-md" style="background: var(--a-pri, #6750a4); color: var(--a-on-pri, white); border-radius: 8px;">
          Primary Color (--a-pri)
        </div>
        <div class="q-pa-md" style="background: var(--a-sec, #625b71); color: var(--a-on-sec, white); border-radius: 8px;">
          Secondary Color (--a-sec)
        </div>
        <div class="q-pa-md" style="background: var(--a-ter, #7d5260); color: var(--a-on-ter, white); border-radius: 8px;">
          Tertiary Color (--a-ter)
        </div>
        <div class="q-pa-md" style="background: var(--a-sur, #fef7ff); color: var(--a-on-sur, #1d1b20); border-radius: 8px;">
          Surface Color (--a-sur)
        </div>
        <div class="q-pa-md" style="background: var(--a-err, #ba1a1a); color: var(--a-on-err, white); border-radius: 8px;">
          Error Color (--a-err)
        </div>
      </div>
    </div>
  `
})

const meta = {
  title: 'Theme/ThemeTest',
  component: ThemeTestComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A test component to verify that the theme system is working correctly in Storybook. Shows various theme colors applied via CSS custom properties and displays debugging information.'
      }
    }
  }
} satisfies Meta<typeof ThemeTestComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default theme colors applied via the global theme decorator. Shows status and available theme variables.'
      }
    }
  }
}

export const WithDarkMode: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Theme colors in dark mode (if dark mode is enabled)'
      }
    }
  },
  decorators: [
    (story) => ({
      components: { story },
      template: '<div class="dark"><story /></div>',
      setup() {
        // Force dark mode for this story
        document.body.classList.add('body--dark')
        return {}
      }
    })
  ]
}
