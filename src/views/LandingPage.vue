<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { rpc } from '../services/rpc.js'

const router = useRouter()

const defaultItems = [
  {
    id: 'item-1',
    label: 'MONOLITHIC SKY-CITY',
    subtitle: 'High-tech architectural portal system initialized.',
    url: 'https://github.com/fanul',
    icon: '❖',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    buttonText: 'EXPLORE ARTIFACT →',
    showInNewsHead: true,
    showInDirectory: true,
    active: true
  }
]

const data = ref({
  profile: {
    title: 'PALE MEKA FUTURE',
    bio: 'Precise, airy, and high-tech digital artifacts portal framed within a monolithic sky-city aesthetic.',
    avatarUrl: '',
    bgUrl: ''
  },
  newsHead: defaultItems,
  broadcast: [
    { id: 'b-1', title: 'SYSTEM ONLINE', body: 'Welcome to Pale Meka Future game portal.', active: true }
  ],
  links: defaultItems,
  settings: { newsHeadInterval: 5, maxNewsHead: 5, scrambleDelay: 2, scrambleInterval: 10 }
})

const error = ref('')

// Text Scramble Animation with Delay & Infinite Loop
const displayedTitle = ref('PALE MEKA FUTURE')
const chars = '!<>-_\\/[]{}—=+*^?#________'
let scrambleFrameTimer = null
let scrambleDelayTimer = null
let scrambleLoopTimer = null

function runTextScramble(newTitle) {
  const target = (newTitle || data.value.profile?.title || 'PALE MEKA FUTURE').toUpperCase()
  if (scrambleFrameTimer) clearInterval(scrambleFrameTimer)
  
  let frame = 0
  const maxFrames = target.length * 3
  
  scrambleFrameTimer = setInterval(() => {
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
      clearInterval(scrambleFrameTimer)
      scrambleFrameTimer = null
    }
  }, 35)
}

function startScrambleScheduler() {
  stopScrambleScheduler()
  
  const title = data.value.profile?.title || 'PALE MEKA FUTURE'
  displayedTitle.value = title.toUpperCase()
  
  const delaySec = Math.max(0, Number(data.value.settings?.scrambleDelay) ?? 2)
  const intervalSec = Math.max(2, Number(data.value.settings?.scrambleInterval) ?? 10)

  // Initial delay before first animation
  scrambleDelayTimer = setTimeout(() => {
    runTextScramble(title)
    
    // Infinite recurring loop
    scrambleLoopTimer = setInterval(() => {
      runTextScramble(title)
    }, intervalSec * 1000)
  }, delaySec * 1000)
}

function stopScrambleScheduler() {
  if (scrambleFrameTimer) clearInterval(scrambleFrameTimer)
  if (scrambleDelayTimer) clearTimeout(scrambleDelayTimer)
  if (scrambleLoopTimer) clearInterval(scrambleLoopTimer)
  scrambleFrameTimer = null
  scrambleDelayTimer = null
  scrambleLoopTimer = null
}

// Easter Egg: Double Right-Click Trigger
let rightClickCount = 0
let rightClickTimer = null

function handleRightClick(event) {
  event.preventDefault() // prevent standard browser context menu
  rightClickCount++
  
  if (rightClickCount === 1) {
    rightClickTimer = setTimeout(() => {
      rightClickCount = 0
    }, 500)
  } else if (rightClickCount >= 2) {
    if (rightClickTimer) clearTimeout(rightClickTimer)
    rightClickCount = 0
    router.push('/admin')
  }
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

onMounted(async () => {
  if (window.__LOG_STEP) window.__LOG_STEP('4. LandingPage onMounted initialized. Starting scramble & timers...')
  startScrambleScheduler()
  startNewsHeadTimer()

  try {
    if (window.__LOG_STEP) window.__LOG_STEP('5. Invoking rpc("getPublicData")...')
    const res = await rpc('getPublicData')
    if (res) {
      if (window.__LOG_STEP) window.__LOG_STEP(`6. getPublicData returned: profile="${res.profile?.title}", items=${res.newsHead?.length || 0}`)
      if (res.profile && res.profile.title) data.value.profile = res.profile
      if (res.newsHead && res.newsHead.length) data.value.newsHead = res.newsHead
      if (res.broadcast && res.broadcast.length) data.value.broadcast = res.broadcast
      if (res.links && res.links.length) data.value.links = res.links
      if (res.settings) data.value.settings = res.settings
      startScrambleScheduler()
      startNewsHeadTimer()
    }
  } catch (e) {
    if (window.__LOG_STEP) window.__LOG_STEP('7. RPC load error: ' + e.message, true)
    console.warn('RPC load notice:', e)
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  stopNewsHeadTimer()
  stopScrambleScheduler()
  if (rightClickTimer) clearTimeout(rightClickTimer)
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
      <!-- Split Hero Section: Far Left Title (Scramble Animated + Double Right-Click Easter Egg) & Far Right News Head Slider -->
      <section id="hero" class="meka-hero-split">
        <!-- Far Left Column with Animated Title & Double Right-Click Easter Egg -->
        <div class="meka-hero-left">
          <h1 
            class="meka-hero-title" 
            v-html="displayedTitle || data.profile.title || 'PALE MEKA FUTURE'"
            @contextmenu="handleRightClick"
            title="Klik kanan 2x untuk membuka Admin Studio"
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
            :key="item.id || idx"
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
              :key="'dot-' + (item.id || idx)"
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
            <div v-for="(item, idx) in data.broadcast" :key="'t1-' + (item.id || idx)" class="meka-ticker-item">
              <span class="meka-ticker-tag">BROADCAST</span>
              <span>{{ item.title }} — {{ item.body }}</span>
            </div>
          </div>
          <!-- Track 2 (Seamless Mirror Loop) -->
          <div class="meka-ticker-track-group" aria-hidden="true">
            <div v-for="(item, idx) in data.broadcast" :key="'t2-' + (item.id || idx)" class="meka-ticker-item">
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
