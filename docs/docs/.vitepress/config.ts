import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'reposell Listing',
  description: 'Official reposell listing - Discover, buy, and sell repository tools',
  lang: 'en-US',
  base: '/reposell-listing/',
  head: [
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Outfit:wght@400;500;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600;700&family=Fira+Code:wght@400;500&family=Baloo+2:wght@500;600;700;800&family=Space+Mono:wght@400;700&display=swap' }],
    ['meta', { property: 'og:image', content: '/reposell-listing/branding/logo.png' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/reposell-listing/branding/icon.png' }],
    ['meta', { name: 'theme-color', content: '#0af188' }],
    // pre-paint: pin home to dark + arm anime.js boot-hide before first frame
    ['script', {}, `(function(){try{var p=location.pathname,h=p==='/docs/'||p==='/docs/index.html'||p==='/'||p==='/index.html';if(!h)return;var d=document.documentElement;d.classList.add('rs-home','dark');if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))d.classList.add('lx-boot')}catch(e){}})()`],
    ['link', { rel: 'icon', type: 'image/png', href: '/reposell-listing/branding/icon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['meta', { name: 'theme-color', content: '#0af188' }],
    ['meta', { name: 'description', content: 'Official reposell listing - Discover, buy, and sell repository tools' }],
  ],
  themeConfig: {
    siteTitle: false,
    description: 'Official reposell listing - Discover, buy, and sell repository tools',
    nav: [
      { text: 'Documentation', link: '/guide/' },
      { text: 'Listing', link: 'https://listing.reposell.dev' },
    ],
    sidebar: {
      '/guide/': [
        { text: 'Overview', link: '/guide/' },
        { text: 'How It Works', link: '/guide/how-it-works' },
        { text: 'Publishing', link: '/guide/publishing' },
        { text: 'Trust Model', link: '/guide/trust-model' },
        { text: 'Self-Hosting', link: '/guide/self-hosting' },
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
      pattern: 'https://github.com/EnzoVezzaro/reposell-listing/edit/main/docs/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
  markdown: {
    theme: 'github-dark',
    lineNumbers: true,
  },
})