<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { rpc } from '../services/rpc.js'

const data = ref({ profile: {}, newsHead: [], broadcast: [], links: [], settings: {} })
const error = ref('')

const currentNewsHeadIndex = ref(0)
let newsHeadTimer = null

const activeDirectoryIndex = ref(0)

function scrollToSection(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function startNewsHeadTimer() {
  stopNewsHeadTimer()
  const intervalSec = Math.max(1, Number(data.value.settings?.newsHeadInterval) || 5)
  if (data.value.newsHead && data.value.newsHead.length > 1) {
    newsHeadTimer = setInterval(() => {
      currentNewsHeadIndex.value = (currentNewsHeadIndex.value + 1) % data.value.newsHead.length
    }, intervalSec * 1000)
  }
}

function stopNewsHeadTimer() {
  if (newsHeadTimer) {
    clearInterval(newsHeadTimer)
    newsHeadTimer = null
  }
}

function selectNewsHead(index) {
  currentNewsHeadIndex.value = index
  startNewsHeadTimer()
}

function prevDirectory() {
  if (!data.value.links || !data.value.links.length) return
  activeDirectoryIndex.value = (activeDirectoryIndex.value - 1 + data.value.links.length) % data.value.links.length
}

function nextDirectory() {
  if (!data.value.links || !data.value.links.length) return
  activeDirectoryIndex.value = (activeDirectoryIndex.value + 1) % data.value.links.length
}

function handleKeydown(event) {
  if (event.key === 'ArrowLeft') {
    prevDirectory()
  } else if (event.key === 'ArrowRight') {
    nextDirectory()
  }
}

onMounted(async () => {
  try {
    data.value = await rpc('getPublicData')
    startNewsHeadTimer()
  } catch (e) {
    error.value = e.message
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  stopNewsHeadTimer()
  window.removeEventListener('keydown', handleKeydown)
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
          <li v-if="data.broadcast && data.broadcast.length"><a class="meka-nav-link" @click.prevent="scrollToSection('broadcast')">// BROADCAST</a></li>
          <li v-if="data.links && data.links.length"><a class="meka-nav-link" @click.prevent="scrollToSection('directory')">// DIRECTORY</a></li>
        </ul>

        <div class="meka-nav-actions">
          <router-link to="/admin" class="btn-amber">
            <span>SYS ADMIN</span>
            <span>⚡</span>
          </router-link>
        </div>
      </header>

      <!-- Split Hero Section (Left: Headline & Bio, Right: News Head Slider) -->
      <section id="hero" class="meka-hero-split">
        <!-- Left Column -->
        <div class="meka-hero-left">
          <p class="meka-eyebrow">
            <span class="meka-eyebrow-status"></span>
            <span>MONOLITHIC SKY-CITY // SYSTEM ONLINE</span>
          </p>
          <h1 class="meka-hero-title">{{ data.profile.title || 'PALE MEKA FUTURE' }}</h1>
          <div class="meka-underline-mark"></div>
          <p class="meka-hero-bio">
            {{ data.profile.bio || 'Precise, airy, and high-tech digital artifacts portal framed within a monolithic sky-city aesthetic.' }}
          </p>
        </div>

        <!-- Right Column: News Head Slider -->
        <div class="news-head-slider" v-if="data.newsHead && data.newsHead.length">
          <div 
            v-for="(item, idx) in data.newsHead" 
            :key="item.id"
            class="news-head-bg"
            :style="{ 
              backgroundImage: `url(${item.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop'})`,
              opacity: idx === currentNewsHeadIndex ? 1 : 0,
              pointerEvents: idx === currentNewsHeadIndex ? 'auto' : 'none'
            }"
          >
            <div class="news-head-overlay"></div>
            <div class="news-head-content">
              <p class="news-head-tag">NEWS HEAD // {{ String(idx + 1).padStart(2, '0') }}</p>
              <h3 class="news-head-title">{{ item.title }}</h3>
              <p class="news-head-subtitle">{{ item.subtitle }}</p>
              <a v-if="item.linkUrl" :href="item.linkUrl" target="_blank" rel="noopener" class="btn-amber" style="padding: 6px 16px; font-size: 11px;">
                EXPLORE ARTIFACT →
              </a>
            </div>
          </div>

          <!-- Bottom Dot Pagination -->
          <div class="news-head-dots">
            <span 
              v-for="(item, idx) in data.newsHead" 
              :key="'dot-' + item.id"
              class="news-head-dot"
              :class="{ active: idx === currentNewsHeadIndex }"
              @click="selectNewsHead(idx)"
            ></span>
          </div>
        </div>
      </section>

      <!-- Broadcast Ticker Section -->
      <section id="broadcast" v-if="data.broadcast && data.broadcast.length" class="meka-ticker-section">
        <div class="meka-ticker-track">
          <div v-for="item in data.broadcast" :key="item.id" class="meka-ticker-item">
            <span class="meka-ticker-tag">SYS // BROADCAST</span>
            <span>{{ item.title }} — {{ item.body }}</span>
          </div>
          <!-- Loop duplicate for continuous marquee -->
          <div v-for="item in data.broadcast" :key="'dup-' + item.id" class="meka-ticker-item">
            <span class="meka-ticker-tag">SYS // BROADCAST</span>
            <span>{{ item.title }} — {{ item.body }}</span>
          </div>
        </div>
      </section>

      <!-- Directory Carousel & Cards Section -->
      <main id="directory" class="meka-directory-section" v-if="data.links && data.links.length">
        <div class="meka-directory-header">
          <div class="meka-section-title" style="margin-bottom: 0; flex: 1;">
            <span>SYSTEM DIRECTORY // CONSTRUCTED MODULES</span>
          </div>

          <div class="directory-nav-controls">
            <span class="directory-counter">
              {{ String(activeDirectoryIndex + 1).padStart(2, '0') }} / {{ String(data.links.length).padStart(2, '0') }}
            </span>
            <button class="btn-arrow" @click="prevDirectory" title="Navigasi Kiri (Arrow Left)">←</button>
            <button class="btn-arrow" @click="nextDirectory" title="Navigasi Kanan (Arrow Right)">→</button>
          </div>
        </div>

        <div class="directory-cards-grid">
          <a 
            v-for="(link, idx) in data.links" 
            :key="link.id" 
            :href="link.url" 
            target="_blank" 
            rel="noopener"
            class="directory-card"
            :class="{ active: idx === activeDirectoryIndex }"
            @mouseenter="activeDirectoryIndex = idx"
          >
            <div 
              class="directory-card-bg" 
              :style="{ backgroundImage: `url(${link.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop'})` }"
            ></div>
            <div class="directory-card-overlay"></div>
            <div class="directory-card-content">
              <span class="directory-card-icon">{{ link.icon || '❖' }}</span>
              <span class="directory-card-label">{{ link.label }}</span>
            </div>
          </a>
        </div>

        <p v-if="error" style="color: #ff4d6d; font-family: var(--font-mono); font-size: 11px; margin-top: 16px;">
          ERR // {{ error }}
        </p>
      </main>

      <!-- Footer Chrome -->
      <footer class="meka-footer">
        <div>
          <span>PALE MEKA FUTURE SYSTEM // GOOGLE APPS SCRIPT & SPREADSHEET</span>
        </div>
        <div>
          <router-link to="/admin">ADMIN STUDIO</router-link>
        </div>
      </footer>
    </div>
  </div>
</template>
