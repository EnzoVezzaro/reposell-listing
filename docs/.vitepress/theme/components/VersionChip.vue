<script setup>
import { ref, onMounted } from 'vue'
const version = ref('')
onMounted(async () => {
  try {
    const res = await fetch('https://api.github.com/repos/EnzoVezzaro/reposell/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (res.ok) {
      const data = await res.json()
      if (data.tag_name) version.value = data.tag_name
    }
  } catch {}
})
</script>

<template>
  <span class="mono">built in the open · <a class="lx-ver" href="https://github.com/EnzoVezzaro/reposell/releases" target="_blank" rel="noopener">{{ version || 'reposell' }}</a></span>
</template>
