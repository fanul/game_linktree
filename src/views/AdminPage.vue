<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { adminArgs, fileToBase64, rpc } from '../services/rpc.js'

const state = reactive({
  profile: { title: '', bio: '', avatarUrl: '', bgUrl: '' },
  items: [],
  broadcast: [],
  settings: {
    driveFolderId: '1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR',
    newsHeadFolderId: '1E_Fm9Nq4lwHgwTGAIilVvije0RkHndgs',
    newsHeadInterval: 5,
    maxNewsHead: 5,
    themeDays: 3,
    themes: ['pale-meka', 'sky-city']
  }
})

const status = ref('Memuat data...')
const isUploading = ref(false)

// Search, Filter & Pagination
const searchQuery = ref('')
const activeFilter = ref('ALL') // ALL, NEWS_HEAD, DIRECTORY, ACTIVE, INACTIVE
const currentPage = ref(1)
const pageSize = 6

const filteredItems = computed(() => {
  let list = state.items || []
  
  if (activeFilter.value === 'NEWS_HEAD') {
    list = list.filter(x => x.showInNewsHead)
  } else if (activeFilter.value === 'DIRECTORY') {
    list = list.filter(x => x.showInDirectory)
  } else if (activeFilter.value === 'ACTIVE') {
    list = list.filter(x => x.active)
  } else if (activeFilter.value === 'INACTIVE') {
    list = list.filter(x => !x.active)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(x => 
      (x.label || '').toLowerCase().includes(q) ||
      (x.subtitle || '').toLowerCase().includes(q) ||
      (x.url || '').toLowerCase().includes(q)
    )
  }

  return list
})

const totalPages = computed(() => Math.ceil(filteredItems.value.length / pageSize) || 1)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredItems.value.slice(start, start + pageSize)
})

async function load() {
  try {
    const data = await rpc('getAdminData', ...adminArgs())
    Object.assign(state, data)
    if (!state.broadcast) state.broadcast = data.news || []
    if (!state.items || !state.items.length) {
      // Migrate legacy if needed
      const migrated = []
      ;(data.newsHead || []).forEach(x => migrated.push({ ...x, label: x.title, url: x.linkUrl, showInNewsHead: true, showInDirectory: false, active: x.active !== false }))
      ;(data.links || []).forEach(x => migrated.push({ ...x, showInNewsHead: false, showInDirectory: true, active: x.active !== false }))
      state.items = migrated
    }
    status.value = 'Data terhubung dengan server & Spreadsheet DB.'
  } catch (e) {
    status.value = 'Error: ' + e.message
  }
}

async function save() {
  try {
    status.value = 'Menyimpan data & menyinkronkan ke Spreadsheet...'
    const res = await rpc('saveAdminData', ...adminArgs(JSON.parse(JSON.stringify(state))))
    status.value = 'Berhasil disimpan pada ' + (res.savedAt || new Date().toLocaleTimeString())
  } catch (e) {
    status.value = 'Error: ' + e.message
  }
}

async function handleFileUpload(event, item, fieldName, folderId) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    isUploading.value = true
    status.value = `Mengunggah gambar ke Google Drive...`
    const base64 = await fileToBase64(file)
    const result = await rpc('uploadFileToDrive', ...adminArgs({
      name: file.name,
      mimeType: file.type,
      base64,
      targetField: fieldName,
      folderId: folderId || state.settings.newsHeadFolderId || '1E_Fm9Nq4lwHgwTGAIilVvije0RkHndgs'
    }))
    if (result && result.url) {
      if (item) {
        item[fieldName] = result.url
      } else if (fieldName === 'bgUrl') {
        state.profile.bgUrl = result.url
      }
      status.value = 'Gambar berhasil diunggah ke Drive!'
    }
  } catch (e) {
    status.value = 'Gagal upload: ' + e.message
  } finally {
    isUploading.value = false
  }
}

function addItem() {
  state.items.unshift({
    id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    label: 'Item Baru',
    subtitle: 'Deskripsi item...',
    url: 'https://',
    icon: '❖',
    imageUrl: '',
    buttonText: 'EXPLORE ARTIFACT →',
    showInNewsHead: true,
    showInDirectory: true,
    active: true
  })
}

function deleteItem(item) {
  const idx = state.items.findIndex(x => x.id === item.id)
  if (idx !== -1) state.items.splice(idx, 1)
}

function addBroadcast() {
  state.broadcast.push({
    id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    title: 'Pesan Broadcast',
    body: 'Tulis isi pengumuman...',
    imageUrl: '',
    active: true
  })
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="meka-page">
    <div class="meka-content">
      <!-- Admin Header Navbar -->
      <header class="meka-navbar">
        <router-link to="/" class="meka-brand">
          <span class="meka-brand-glyph">⬡</span>
          <span>PALE MEKA // ADMIN STUDIO</span>
        </router-link>
        <div class="meka-nav-actions">
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--color-medium-blue-gray); margin-right: 12px;">
            {{ status }}
          </span>
          <router-link to="/" class="btn-cyan">← LANDING</router-link>
        </div>
      </header>

      <main class="admin-container">
        <div class="admin-grid">
          <!-- Profile Settings -->
          <section class="admin-card">
            <h2 class="meka-eyebrow" style="font-size: 12px; margin-bottom: 16px;">01 // PROFIL PORTAL</h2>
            <div class="admin-field">
              <label>Judul Portal</label>
              <input v-model="state.profile.title" class="admin-input" placeholder="Judul Portal">
            </div>
            <div class="admin-field">
              <label>Bio / Deskripsi</label>
              <textarea v-model="state.profile.bio" class="admin-textarea" rows="2" placeholder="Deskripsi portal"></textarea>
            </div>
            <div class="admin-field">
              <label>Background Image URL</label>
              <div class="admin-inline-input">
                <input v-model="state.profile.bgUrl" class="admin-input" style="flex: 1;" placeholder="https://lh3.googleusercontent.com/d/...">
                <label class="upload-icon-btn">
                  <span>📁 UPLOAD BG</span>
                  <input type="file" accept="image/*" style="display: none;" @change="handleFileUpload($event, null, 'bgUrl', state.settings.driveFolderId)" :disabled="isUploading">
                </label>
              </div>
            </div>
          </section>

          <!-- Storage Settings & News Head Config -->
          <section class="admin-card">
            <h2 class="meka-eyebrow" style="font-size: 12px; margin-bottom: 16px;">02 // CONFIG & DRIVE STORAGE</h2>
            <div class="admin-field">
              <label>Folder ID Gambar (News Head & Directory): 1E_Fm9Nq4lwHgwTGAIilVvije0RkHndgs</label>
              <input v-model="state.settings.newsHeadFolderId" class="admin-input" placeholder="1E_Fm9Nq4lwHgwTGAIilVvije0RkHndgs">
            </div>
            <div class="admin-field">
              <label>Folder ID Background: 1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR</label>
              <input v-model="state.settings.driveFolderId" class="admin-input" placeholder="1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR">
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px;">
              <div class="admin-field">
                <label>Rolling Slider (s)</label>
                <input v-model.number="state.settings.newsHeadInterval" type="number" min="1" max="60" class="admin-input" style="text-align: center;">
              </div>
              <div class="admin-field">
                <label>Max News Head</label>
                <input v-model.number="state.settings.maxNewsHead" type="number" min="1" max="20" class="admin-input" style="text-align: center;">
              </div>
              <div class="admin-field">
                <label>Jeda Judul (s)</label>
                <input v-model.number="state.settings.scrambleDelay" type="number" min="0" max="60" class="admin-input" style="text-align: center;">
              </div>
              <div class="admin-field">
                <label>Loop Judul (s)</label>
                <input v-model.number="state.settings.scrambleInterval" type="number" min="2" max="120" class="admin-input" style="text-align: center;">
              </div>
            </div>
          </section>

          <!-- Unified Items Manager (News Head + Directory) with Search, Filter & Pagination -->
          <section class="admin-card admin-grid-full">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <div>
                <h2 class="meka-eyebrow" style="font-size: 12px; margin: 0;">03 // UNIFIED ITEM MANAGER (NEWS HEAD & DIRECTORY)</h2>
                <small style="font-family: var(--font-mono); font-size: 10px; color: var(--color-medium-blue-gray);">
                  Gunakan centang untuk menampilkan di News Head slider atau Directory carousel. Total: {{ state.items.length }} item
                </small>
              </div>
              <button class="btn-cyan" @click="addItem">+ TAMBAH ITEM BARU</button>
            </div>

            <!-- Toolbar: Search & Filter Tabs -->
            <div class="admin-toolbar">
              <div style="flex: 1; max-width: 320px;">
                <input v-model="searchQuery" class="admin-input" style="padding: 6px 12px; font-size: 12px;" placeholder="🔍 Cari item label/url...">
              </div>

              <div class="admin-filter-group">
                <button class="admin-filter-btn" :class="{ active: activeFilter === 'ALL' }" @click="activeFilter = 'ALL'; currentPage = 1">SEMUA ({{ state.items.length }})</button>
                <button class="admin-filter-btn" :class="{ active: activeFilter === 'NEWS_HEAD' }" @click="activeFilter = 'NEWS_HEAD'; currentPage = 1">NEWS HEAD</button>
                <button class="admin-filter-btn" :class="{ active: activeFilter === 'DIRECTORY' }" @click="activeFilter = 'DIRECTORY'; currentPage = 1">DIRECTORY</button>
                <button class="admin-filter-btn" :class="{ active: activeFilter === 'ACTIVE' }" @click="activeFilter = 'ACTIVE'; currentPage = 1">AKTIF</button>
                <button class="admin-filter-btn" :class="{ active: activeFilter === 'INACTIVE' }" @click="activeFilter = 'INACTIVE'; currentPage = 1">NON-AKTIF</button>
              </div>

              <div class="admin-pagination">
                <button class="admin-filter-btn" :disabled="currentPage <= 1" @click="currentPage--">← PREV</button>
                <span>{{ currentPage }} / {{ totalPages }}</span>
                <button class="admin-filter-btn" :disabled="currentPage >= totalPages" @click="currentPage++">NEXT →</button>
              </div>
            </div>

            <!-- Item Row List -->
            <div v-for="item in paginatedItems" :key="item.id" style="padding: 16px 0; border-top: 1px solid var(--color-soft-gray-border); display: flex; flex-direction: column; gap: 10px;">
              <div style="display: grid; grid-template-columns: 50px 1.5fr 2fr 1.5fr 1.2fr auto; gap: 10px; align-items: center;">
                <input v-model="item.icon" class="admin-input" style="text-align: center;" placeholder="Icon">
                <input v-model="item.label" class="admin-input" placeholder="Label / Judul">
                <input v-model="item.subtitle" class="admin-input" placeholder="Subtitle / Deskripsi Singkat">
                <input v-model="item.url" class="admin-input" placeholder="https://...">
                <input v-model="item.buttonText" class="admin-input" placeholder="Teks Tombol Slider">
                <button class="btn-danger" @click="deleteItem(item)">HAPUS</button>
              </div>

              <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                <div class="admin-inline-input" style="flex: 1;">
                  <input v-model="item.imageUrl" class="admin-input" style="flex: 1; font-size: 11px;" placeholder="URL Gambar (Drive Folder: 1E_Fm9Nq4lwHgwTGAIilVvije0RkHndgs)">
                  <label class="upload-icon-btn">
                    <span>📁 UPLOAD GAMBAR</span>
                    <input type="file" accept="image/*" style="display: none;" @change="handleFileUpload($event, item, 'imageUrl', state.settings.newsHeadFolderId)" :disabled="isUploading">
                  </label>
                </div>

                <div style="display: flex; align-items: center; gap: 14px; font-family: var(--font-mono); font-size: 11px; color: var(--color-navy-cyan);">
                  <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input v-model="item.showInNewsHead" type="checkbox"> Tampil di News Head
                  </label>
                  <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input v-model="item.showInDirectory" type="checkbox"> Tampil di Directory
                  </label>
                  <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input v-model="item.active" type="checkbox"> Aktif
                  </label>
                </div>
              </div>
            </div>

            <div v-if="!filteredItems.length" style="padding: 24px 0; text-align: center; font-family: var(--font-mono); font-size: 12px; color: var(--color-medium-blue-gray);">
              Tidak ada item yang sesuai dengan pencarian / filter.
            </div>
          </section>

          <!-- Broadcast Messages Editor -->
          <section class="admin-card admin-grid-full">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h2 class="meka-eyebrow" style="font-size: 12px; margin: 0;">04 // BROADCAST MESSAGES</h2>
              <button class="btn-cyan" @click="addBroadcast">+ TAMBAH BROADCAST</button>
            </div>
            <div v-for="(b, i) in state.broadcast" :key="b.id" style="padding: 12px 0; border-top: 1px solid var(--color-soft-gray-border); display: grid; grid-template-columns: 1fr 2fr 90px auto; gap: 12px; align-items: center;">
              <input v-model="b.title" class="admin-input" placeholder="Judul Broadcast">
              <input v-model="b.body" class="admin-input" placeholder="Isi Pesan Broadcast">
              <label style="font-family: var(--font-mono); font-size: 11px; display: flex; align-items: center; gap: 6px; color: var(--color-navy-cyan);">
                <input v-model="b.active" type="checkbox"> Aktif
              </label>
              <button class="btn-danger" @click="state.broadcast.splice(i, 1)">HAPUS</button>
            </div>
          </section>
        </div>

        <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
          <button class="btn-amber" style="padding: 14px 32px; font-size: 13px;" @click="save">
            SIMPAN SEMUA PERUBAHAN & SINKRON SPREADSHEET DB
          </button>
        </div>
      </main>
    </div>
  </div>
</template>
