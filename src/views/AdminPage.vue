<script setup>
import { onMounted, reactive, ref } from 'vue'
import { adminArgs, fileToBase64, rpc } from '../services/rpc.js'

const key = ref(sessionStorage.getItem('googleIdToken') || sessionStorage.getItem('adminKey') || '')
const state = reactive({
  profile: { title: '', bio: '', avatarUrl: '', bgUrl: '' },
  news: [],
  links: [],
  settings: { driveFolderId: '1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR', spreadsheetId: '', themeDays: 3, themes: ['void', 'neon'] }
})

const status = ref('Masukkan Google ID Token atau Admin Key.')
const isUploading = ref(false)

async function load() {
  sessionStorage.setItem('googleIdToken', key.value)
  sessionStorage.setItem('adminKey', key.value)
  try {
    const data = await rpc('getAdminData', ...adminArgs())
    Object.assign(state, data)
    status.value = 'Data berhasil dimuat dari server.'
  } catch (e) {
    status.value = 'Error: ' + e.message
  }
}

async function save() {
  try {
    status.value = 'Menyimpan data...'
    const res = await rpc('saveAdminData', ...adminArgs(JSON.parse(JSON.stringify(state))))
    status.value = 'Berhasil disimpan pada ' + (res.savedAt || new Date().toLocaleTimeString())
  } catch (e) {
    status.value = 'Error: ' + e.message
  }
}

async function handleBgUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    isUploading.value = true
    status.value = 'Mengunggah background ke Google Drive...'
    const base64 = await fileToBase64(file)
    const result = await rpc('uploadFileToDrive', ...adminArgs({
      name: file.name,
      mimeType: file.type,
      base64,
      targetField: 'bgUrl',
      folderId: state.settings.driveFolderId || '1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR'
    }))
    if (result && result.url) {
      state.profile.bgUrl = result.url
      status.value = 'Background berhasil diunggah ke Drive!'
    }
  } catch (e) {
    status.value = 'Gagal upload background: ' + e.message
  } finally {
    isUploading.value = false
  }
}

function addNews() {
  state.news.push({ id: crypto.randomUUID(), title: 'Berita baru', body: 'Tulis berita...', imageUrl: '', active: true })
}

function addLink() {
  state.links.push({ id: crypto.randomUUID(), label: 'Link baru', url: 'https://', icon: '❖', active: true })
}

onMounted(() => {
  if (key.value) load()
})
</script>

<template>
  <div class="meka-page">
    <div class="meka-content">
      <!-- Admin Header Navbar -->
      <header class="meka-navbar">
        <router-link to="/" class="meka-brand">
          <span class="meka-brand-glyph">◇</span>
          <span>MEKAVERSE // ADMIN STUDIO</span>
        </router-link>
        <div class="meka-nav-actions">
          <router-link to="/" class="btn-meka">← LIHAT LANDING</router-link>
        </div>
      </header>

      <main class="admin-container">
        <!-- Login & Status Section -->
        <section class="admin-card">
          <div class="admin-field">
            <label>Authentication Token / Admin Key</label>
            <div style="display: flex; gap: 12px;">
              <input v-model="key" type="password" class="admin-input" placeholder="Google ID Token / Admin Key" style="flex: 1;">
              <button class="btn-meka btn-meka-bone" @click="load">AUTHENTICATE & LOAD</button>
            </div>
            <span style="font-family: var(--font-mono); font-size: 11px; color: var(--color-ash); margin-top: 6px;">
              STATUS // {{ status }}
            </span>
          </div>
        </section>

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
              <textarea v-model="state.profile.bio" class="admin-textarea" rows="3" placeholder="Deskripsi portal"></textarea>
            </div>
            <div class="admin-field">
              <label>URL Avatar</label>
              <input v-model="state.profile.avatarUrl" class="admin-input" placeholder="https://...">
            </div>
          </section>

          <!-- Background & Google Storage Settings -->
          <section class="admin-card">
            <h2 class="meka-eyebrow" style="font-size: 12px; margin-bottom: 16px;">02 // BACKGROUND & GOOGLE DRIVE</h2>
            <div class="admin-field">
              <label>Google Drive Folder ID (Default: 1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR)</label>
              <input v-model="state.settings.driveFolderId" class="admin-input" placeholder="1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR">
            </div>
            <div class="admin-field">
              <label>Background Image URL</label>
              <input v-model="state.profile.bgUrl" class="admin-input" placeholder="https://lh3.googleusercontent.com/d/...">
            </div>
            <div class="admin-field">
              <label>Unggah Background ke Google Drive</label>
              <div class="upload-box">
                <input type="file" accept="image/*" @change="handleBgUpload" :disabled="isUploading">
                <img v-if="state.profile.bgUrl" :src="state.profile.bgUrl" class="upload-preview" alt="Preview Background">
              </div>
            </div>
          </section>

          <!-- News Ticker Editor -->
          <section class="admin-card admin-grid-full">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h2 class="meka-eyebrow" style="font-size: 12px; margin: 0;">03 // NEWS TICKER</h2>
              <button class="btn-meka" @click="addNews">+ TAMBAH BERITA</button>
            </div>
            <div v-for="(n, i) in state.news" :key="n.id" style="padding: 14px 0; border-top: 1px solid var(--color-frost-hairline); display: grid; grid-template-columns: 1fr 2fr 100px auto; gap: 12px; align-items: center;">
              <input v-model="n.title" class="admin-input" placeholder="Judul News">
              <input v-model="n.body" class="admin-input" placeholder="Isi Pesan News">
              <label style="font-family: var(--font-mono); font-size: 11px; display: flex; align-items: center; gap: 6px; color: var(--color-bone);">
                <input v-model="n.active" type="checkbox"> Aktif
              </label>
              <button class="btn-meka btn-meka-danger" @click="state.news.splice(i, 1)">HAPUS</button>
            </div>
          </section>

          <!-- Links Editor -->
          <section class="admin-card admin-grid-full">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h2 class="meka-eyebrow" style="font-size: 12px; margin: 0;">04 // DIRECTORY LINKS</h2>
              <button class="btn-meka" @click="addLink">+ TAMBAH LINK</button>
            </div>
            <div v-for="(l, i) in state.links" :key="l.id" style="padding: 12px 0; border-top: 1px solid var(--color-frost-hairline); display: grid; grid-template-columns: 60px 1fr 2fr 100px auto; gap: 12px; align-items: center;">
              <input v-model="l.icon" class="admin-input" style="text-align: center;" placeholder="Icon">
              <input v-model="l.label" class="admin-input" placeholder="Nama Label">
              <input v-model="l.url" class="admin-input" placeholder="https://...">
              <label style="font-family: var(--font-mono); font-size: 11px; display: flex; align-items: center; gap: 6px; color: var(--color-bone);">
                <input v-model="l.active" type="checkbox"> Aktif
              </label>
              <button class="btn-meka btn-meka-danger" @click="state.links.splice(i, 1)">×</button>
            </div>
          </section>
        </div>

        <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
          <button class="btn-meka btn-meka-bone" style="padding: 12px 28px; font-size: 12px;" @click="save">
            SIMPAN SEMUA PERUBAHAN
          </button>
        </div>
      </main>
    </div>
  </div>
</template>
