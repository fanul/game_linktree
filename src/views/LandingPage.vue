<script setup>
import { onMounted, ref } from 'vue'
import { rpc } from '../services/rpc.js'

const data = ref({ profile: {}, news: [], links: [], theme: {} })
const error = ref('')

function scrollToSection(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

onMounted(async () => {
  try {
    data.value = await rpc('getPublicData')
  } catch (e) {
    error.value = e.message
  }
})
</script>

<template>
  <div class="meka-page">
    <!-- Background Canvas & Sky-City Atmosphere Layer -->
    <div 
      class="meka-bg-canvas" 
      :style="{ backgroundImage: `url(${data.profile.bgUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop'})` }"
    ></div>
    <div class="meka-bg-overlay"></div>

    <div class="meka-content">
      <!-- Pale Meka Top Navigation Bar -->
      <header class="meka-navbar">
        <a href="#" class="meka-brand">
          <span class="meka-brand-glyph">⬡</span>
          <span>{{ data.profile.title || 'PALE MEKA FUTURE' }}</span>
        </a>

        <ul class="meka-nav-items">
          <li><a class="meka-nav-link" @click.prevent="scrollToSection('hero')">// OVERVIEW</a></li>
          <li v-if="data.news.length"><a class="meka-nav-link" @click.prevent="scrollToSection('news')">// BROADCAST</a></li>
          <li v-if="data.links.length"><a class="meka-nav-link" @click.prevent="scrollToSection('links')">// DIRECTORY</a></li>
        </ul>

        <div class="meka-nav-actions">
          <router-link to="/admin" class="btn-amber">
            <span>SYS ADMIN</span>
            <span>⚡</span>
          </router-link>
        </div>
      </header>

      <!-- Hero Headline Section -->
      <section id="hero" class="meka-hero-container">
        <p class="meka-eyebrow">
          <span class="meka-eyebrow-status"></span>
          <span>MONOLITHIC SKY-CITY // SYSTEM ONLINE</span>
        </p>
        <h1 class="meka-hero-title">{{ data.profile.title || 'PALE MEKA FUTURE' }}</h1>
        <div class="meka-underline-mark"></div>
        <p class="meka-hero-bio">
          {{ data.profile.bio || 'Precise, airy, and high-tech digital artifacts portal framed within a monolithic sky-city aesthetic.' }}
        </p>
      </section>

      <!-- Technical Emerald Broadcast Ticker -->
      <section id="news" v-if="data.news.length" class="meka-ticker-section">
        <div class="meka-ticker-track">
          <div v-for="item in data.news" :key="item.id" class="meka-ticker-item">
            <span class="meka-ticker-tag">SYS // BROADCAST</span>
            <span>{{ item.title }} — {{ item.body }}</span>
          </div>
          <!-- Loop duplicate for continuous marquee -->
          <div v-for="item in data.news" :key="'dup-' + item.id" class="meka-ticker-item">
            <span class="meka-ticker-tag">SYS // BROADCAST</span>
            <span>{{ item.title }} — {{ item.body }}</span>
          </div>
        </div>
      </section>

      <!-- Directory Links Section -->
      <main id="links" class="meka-cards-container">
        <div class="meka-section-title">
          <span>SYSTEM DIRECTORY // CONSTRUCTED MODULES</span>
        </div>

        <div class="meka-links-grid">
          <a 
            v-for="link in data.links" 
            :key="link.id" 
            :href="link.url" 
            target="_blank" 
            rel="noopener"
            class="meka-link-card"
          >
            <span class="meka-link-icon">{{ link.icon || '❖' }}</span>
            <span class="meka-link-label">{{ link.label }}</span>
          </a>
        </div>

        <p v-if="error" style="color: #ff4d6d; font-family: var(--font-mono); font-size: 11px;">
          ERR // {{ error }}
        </p>
      </main>

      <!-- Footer Chrome -->
      <footer class="meka-footer">
        <div>
          <span>PALE MEKA FUTURE SYSTEM // GOOGLE APPS SCRIPT</span>
        </div>
        <div>
          <router-link to="/admin">ADMIN STUDIO</router-link>
        </div>
      </footer>
    </div>
  </div>
</template>
