// PostHog product + web analytics. Public write-only key is safe in client code.
// A personal key (phx_) must never be committed here.
import type { PostHog } from 'posthog-js'
import type { Router } from 'vitepress'

const POSTHOG_KEY = 'phc_oA9YRYsvPM4TWSAfaGwHzKeXJPsEEQKGunhTkzqALPyt'
const POSTHOG_HOST = 'https://us.i.posthog.com'
const POSTHOG_UI_HOST = 'https://us.i.posthog.com'

let client: PostHog | null = null

export function initAnalytics() {
  if (typeof window === 'undefined' || (navigator as any).webdriver) return
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      ui_host: POSTHOG_UI_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      person_profiles: 'identified_only',
      disable_session_recording: true,
    })
    client = posthog
  }).catch((error) => console.warn('Analytics failed to load', error))
}

export function watchRoute(router: Router) {
  router.onAfterRouteChanged?.((to: string) => client?.capture('$pageview', { route: to }))
}

export function track(event: string, properties?: Record<string, string | number | boolean>) {
  client?.capture(event, properties)
}
