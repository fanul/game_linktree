<script setup>
import { onMounted, ref } from 'vue'
import { rpc } from '../services/rpc.js'
const data = ref({ profile: {}, news: [], links: [], theme: {} })
const error = ref('')
onMounted(async () => { try { data.value = await rpc('getPublicData') } catch (e) { error.value = e.message } })
</script>
<template>
  <main class="page" :style="data.theme.variables">
    <section v-if="data.news.length" class="ticker"><div class="ticker-track"><span v-for="item in data.news" :key="item.id">🎮 {{ item.title }} — {{ item.body }}</span></div></section>
    <section class="profile card">
      <img v-if="data.profile.avatarUrl" :src="data.profile.avatarUrl" alt="Avatar profil">
      <h1>{{ data.profile.title || 'Game Portal' }}</h1><p>{{ data.profile.bio || 'Semua tautan game favorit dalam satu tempat.' }}</p>
    </section>
    <nav class="links" aria-label="Tautan game"><a v-for="link in data.links" :key="link.id" :href="link.url" target="_blank" rel="noopener"><span>{{ link.icon || '⚔️' }}</span>{{ link.label }}</a></nav>
    <p v-if="error" class="error">{{ error }}</p>
    <router-link class="admin-link" to="/admin">Admin</router-link>
  </main>
</template>
