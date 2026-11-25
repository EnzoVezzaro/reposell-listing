import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitepress'

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8'))

// Canonical origin is fixed, never derived from the deploy host, so a preview
// deployment cannot emit canonicals or social URLs pointing at itself.
const siteUrl = 'https://listing.reposell.dev'

const siteDescription =
  'The official reposell discovery directory — browse Ed25519-verified software listings, immutable release records and live /sell checks, all backed by a Git-native registry.'

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'reposell Listing',
      url: siteUrl,
      description: siteDescription,
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#software`,
      name: 'reposell Listing',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      url: siteUrl,
      description: siteDescription,
    },
  ],
}

function canonicalPath(relativePath: string): string {
  const source = relativePath.replace(/\.md$/, '')
  if (source === 'index') return '/'
  if (source.endsWith('/index')) return `/${source.slice(0, -'/index'.length)}/`
  return `/${source}`
}

export default defineConfig({
  title: 'reposell Listing',
  description: siteDescription,
  lang: 'en-US',
  base: '/',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/branding/icon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/branding/icon.png' }],
    ['meta', { name: 'theme-color', content: '#0af188' }],
    ['meta', { property: 'og:image', content: `${siteUrl}/branding/logo.png` }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'reposell Listing' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['script', { type: 'application/ld+json' }, JSON.stringify(structuredData)],
    ['script', {}, `(function(){try{var p=location.pathname,b='/docs/',h=p===b||p===b+'index.html'||p==='/'||p==='/index.html';if(!h)return;var d=document.documentElement;d.classList.add('rs-home','dark');if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))d.classList.add('lx-boot')}catch(e){}})()`],
  ],
  transformHead({ pageData }) {
    if (pageData.isNotFound) return []
    const canonical = `${siteUrl}${canonicalPath(pageData.relativePath)}`
    return [
      ['link', { rel: 'canonical', href: canonical }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { property: 'og:title', content: pageData.title || 'reposell Listing' }],
    ]
  },
  themeConfig: {
    siteTitle: false,
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Registry', link: '/registry/listings' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Overview', link: '/guide/' },
            { text: 'How It Works', link: '/guide/how-it-works' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ],
        },
      ],
      '/registry/': [
        {
          text: 'Registry',
          items: [
            { text: 'Connected Listings', link: '/registry/listings' },
            { text: 'Overview', link: '/registry/' },
            { text: 'PR Verification', link: '/registry/verification' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/EnzoVezzaro/reposell-listing' },
    ],
    footer: {
      message: 'Built by Enzo Vezzaro — from the Dominican Republic, for the world.',
      copyright: '© 2026 Enzo Vezzaro · MIT License',
    },
    search: {
      provider: 'local',
    },
    editLink: {
      pattern: 'https://github.com/EnzoVezzaro/reposell-listing/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
  markdown: {
    theme: 'github-dark',
    lineNumbers: true,
  },
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@reposell/design-system': '../branding',
      },
    },
  },
})
