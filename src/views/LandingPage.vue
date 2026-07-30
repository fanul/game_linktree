<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { rpc } from '../services/rpc.js'

const router = useRouter()
const data = ref({ profile: {}, newsHead: [], broadcast: [], links: [], settings: {} })
const error = ref('')

// Text Scramble Animation
const displayedTitle = ref('')
const chars = '!<>-_\\/[]{}—=+*^?#________'
let scrambleTimer = null

function runTextScramble(newTitle) {
  if (!newTitle) return
  if (scrambleTimer) clearInterval(scrambleTimer)
  
  const target = newTitle.toUpperCase()
  let frame = 0
  const maxFrames = target.length * 3
  
  scrambleTimer = setInterval(() => {
    let output = ''
    let complete = 0
    
    for (let i = 0; i < target.length; i++) {
      if (target[i] === ' ') {
        output += ' '
        complete++
      } else if (frame >= (i + 1) * 3) {
        output += target[i]
        complete++
      } else {
        const randomChar = chars[Math.floor(Math.random() * chars.length)]
        output += `<span class="scramble-char">${randomChar}</span>`
      }
    }
    
    displayedTitle.value = output
    frame++
    
    if (complete === target.length || frame > maxFrames + 10) {
      displayedTitle.value = target
      clearInterval(scrambleTimer)
      scrambleTimer = null
    }
  }, 35)
}

function goToAdmin() {
  router.push('/admin')
}

// News Head Slider Timer
const currentNewsHeadIndex = ref(0)
let newsHeadTimer = null

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

// Directory Carousel Navigation
const activeDirectoryIndex = ref(0)

function prevDirectory() {
  if (!data.value.links || !data.value.links.length) return
  activeDirectoryIndex.value = (activeDirectoryIndex.value - 1 + data.value.links.length) % data.value.links.length
}

function nextDirectory() {
  if (!data.value.links || !data.value.links.length) return
  activeDirectoryIndex.value = (activeDirectoryIndex.value + 1) % data.value.links.length
}

function openActiveDirectoryUrl() {
  const current = data.value.links && data.value.links[activeDirectoryIndex.value]
  if (current && current.url) {
    window.open(current.url, '_blank', 'noopener')
  }
}

function handleKeydown(event) {
  if (event.key === 'ArrowLeft') {
    prevDirectory()
  } else if (event.key === 'ArrowRight') {
    nextDirectory()
  }
}

watch(() => data.value.profile?.title, (newTitle) => {
  if (newTitle) runTextScramble(newTitle)
})

onMounted(async () => {
  try {
    data.value = await rpc('getPublicData')
    if (data.value.profile?.title) {
      runTextScramble(data.value.profile.title)
    } else {
      runTextScramble('PALE MEKA FUTURE')
    }
    startNewsHeadTimer()
  } catch (e) {
    error.value = e.message
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  stopNewsHeadTimer()
  if (scrambleTimer) clearInterval(scrambleTimer)
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
      <!-- Split Hero Section: Far Left Title (Scramble Animated + Easter Egg Double-Click) & Far Right News Head Slider -->
      <section id="hero" class="meka-hero-split">
        <!-- Far Left Column with Animated Title & Easter Egg -->
        <div class="meka-hero-left">
          <h1 
            class="meka-hero-title" 
            v-html="displayedTitle || data.profile.title || 'PALE MEKA FUTURE'"
            @dblclick="goToAdmin"
            title="Klik 2x untuk membuka Admin Studio"
          ></h1>
          <div class="meka-underline-mark"></div>
          <p class="meka-hero-bio">
            {{ data.profile.bio || 'Precise, airy, and high-tech digital artifacts portal framed within a monolithic sky-city aesthetic.' }}
          </p>
        </div>

        <!-- Far Right Column: News Head Slider -->
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
              <h3 class="news-head-title">{{ item.label || item.title }}</h3>
              <p class="news-head-subtitle">{{ item.subtitle }}</p>
              <a v-if="item.url || item.linkUrl" :href="item.url || item.linkUrl" target="_blank" rel="noopener" class="btn-amber" style="padding: 6px 16px; font-size: 11px;">
                {{ item.buttonText || 'EXPLORE ARTIFACT →' }}
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

      <!-- Smooth Continuous Broadcast Marquee Section -->
      <section id="broadcast" v-if="data.broadcast && data.broadcast.length" class="meka-ticker-section">
        <div class="meka-ticker-wrapper">
          <!-- Track 1 -->
          <div class="meka-ticker-track-group">
            <div v-for="item in data.broadcast" :key="'t1-' + item.id" class="meka-ticker-item">
              <span class="meka-ticker-tag">BROADCAST</span>
              <span>{{ item.title }} — {{ item.body }}</span>
            </div>
          </div>
          <!-- Track 2 (Seamless Mirror Loop) -->
          <div class="meka-ticker-track-group" aria-hidden="true">
            <div v-for="item in data.broadcast" :key="'t2-' + item.id" class="meka-ticker-item">
              <span class="meka-ticker-tag">BROADCAST</span>
              <span>{{ item.title }} — {{ item.body }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Full-Bleed Directory Showcase Section (Directly Below Broadcast, Zero Gap) -->
      <section 
        id="directory" 
        class="directory-showcase-container"
        v-if="data.links && data.links.length"
        @click="openActiveDirectoryUrl"
      >
        <!-- Background Image of Active Directory Item -->
        <div 
          class="directory-showcase-bg"
          :style="{ backgroundImage: `url(${data.links[activeDirectoryIndex]?.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop'})` }"
        ></div>
        <div class="directory-showcase-overlay"></div>

        <!-- Counter Badge Overlay -->
        <div class="directory-showcase-counter">
          {{ String(activeDirectoryIndex + 1).padStart(2, '0') }} / {{ String(data.links.length).padStart(2, '0') }}
        </div>

        <!-- Glowing Pulsing Left Navigation Arrow (<) -->
        <button class="directory-nav-arrow prev" @click.stop="prevDirectory" title="Navigasi Kiri (<)">
          &lt;
        </button>

        <!-- Glowing Pulsing Right Navigation Arrow (>) -->
        <button class="directory-nav-arrow next" @click.stop="nextDirectory" title="Navigasi Kanan (>)">
          &gt;
        </button>

        <!-- Active Item Overlay Details -->
        <div class="directory-showcase-content">
          <p class="directory-showcase-badge">DIRECTORY MODULE {{ String(activeDirectoryIndex + 1).padStart(2, '0') }}</p>
          <h2 class="directory-showcase-title">
            <span style="color: var(--color-amber-gold); margin-right: 12px;">{{ data.links[activeDirectoryIndex]?.icon || '❖' }}</span>
            {{ data.links[activeDirectoryIndex]?.label }}
          </h2>
          <p v-if="data.links[activeDirectoryIndex]?.subtitle" style="color: rgba(255, 255, 255, 0.85); font-size: 14px; margin-bottom: 16px;">
            {{ data.links[activeDirectoryIndex]?.subtitle }}
          </p>
          <span class="btn-amber" style="display: inline-flex; font-size: 11px; padding: 6px 16px;">
            OPEN DIRECTORY LINK ↗
          </span>
        </div>
      </section>

      <p v-if="error" style="color: #ff4d6d; font-family: var(--font-mono); font-size: 11px; text-align: center; margin-bottom: 20px;">
        ERR // {{ error }}
      </p>
    </div>
  </div>
</template>
