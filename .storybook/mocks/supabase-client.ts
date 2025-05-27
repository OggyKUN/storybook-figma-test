import { action } from '@storybook/addon-actions'

// Mock Supabase client for Storybook
const mockSupabaseClient = {
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: () => Promise.resolve({ data: null, error: null }),
        order: (column: string, options?: any) => Promise.resolve({ data: [], error: null })
      }),
      order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
      anyOf: (values: any[]) => Promise.resolve({ data: [], error: null })
    }),
    insert: action(`supabase.from(${table}).insert`),
    update: action(`supabase.from(${table}).update`),
    delete: action(`supabase.from(${table}).delete`),
    upsert: action(`supabase.from(${table}).upsert`)
  }),

  rpc: (functionName: string, params?: any) => {
    action(`supabase.rpc(${functionName})`)(params)
    return Promise.resolve({ data: 'mock-chat-id', error: null })
  },

  auth: {
    getUser: () => Promise.resolve({
      data: {
        user: {
          id: 'mock-user-id',
          email: 'mock@example.com'
        }
      },
      error: null
    }),
    getSession: () => Promise.resolve({
      data: {
        session: {
          user: {
            id: 'mock-user-id',
            email: 'mock@example.com'
          }
        }
      },
      error: null
    }),
    signInWithPassword: action('supabase.auth.signInWithPassword'),
    signUp: action('supabase.auth.signUp'),
    signOut: action('supabase.auth.signOut')
  },

  channel: (name: string) => ({
    on: (event: string, config: any, callback: Function) => ({
      subscribe: (callback?: Function) => {
        if (callback) callback('SUBSCRIBED')
        return {
          unsubscribe: action(`supabase.channel(${name}).unsubscribe`)
        }
      }
    }),
    subscribe: (callback?: Function) => {
      if (callback) callback('SUBSCRIBED')
      return {
        unsubscribe: action(`supabase.channel(${name}).unsubscribe`)
      }
    },
    unsubscribe: action(`supabase.channel(${name}).unsubscribe`)
  }),

  storage: {
    from: (bucket: string) => ({
      upload: action(`supabase.storage.from(${bucket}).upload`),
      download: action(`supabase.storage.from(${bucket}).download`),
      remove: action(`supabase.storage.from(${bucket}).remove`),
      list: () => Promise.resolve({ data: [], error: null })
    })
  }
}

export const supabase = mockSupabaseClient
export default mockSupabaseClient
