import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'reposell Listing',
  description: 'Discover verified tools. Publish with cryptographic trust.',
  lang: 'en-US',
  base: '/',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/branding/icon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/branding/icon.png' }],
    ['meta', { name: 'theme-color', content: '#0af188' }],
    ['meta', { property: 'og:image', content: '/branding/logo.png' }],
    ['meta', { name: 'description', content: 'The official reposell discovery directory — registry, verification, and discovery payments' }],
    ['script', {}, `(function(){try{var p=location.pathname,b='/docs/',h=p===b||p===b+'index.html'||p==='/'||p==='/index.html';if(!h)return;var d=document.documentElement;d.classList.add('rs-home','dark');if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))d.classList.add('lx-boot')}catch(e){}})()`],
  ],
  themeConfig: {
    siteTitle: false,
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Registry', link: '/registry/' },
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
      message: 'Made with ☕ and 🎧 by a solo developer from the Dominican Republic.',
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
    resolve: {
      alias: {
        '@reposell/design-system': '../branding',
      },
    },
  },
})
