<script setup>
import { onMounted, reactive, ref } from 'vue'
import { adminArgs, fileToBase64, rpc } from '../services/rpc.js'

const state = reactive({
  profile: { title: '', bio: '', avatarUrl: '', bgUrl: '' },
  newsHead: [],
  broadcast: [],
  links: [],
  settings: {
    driveFolderId: '1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR',
    newsHeadFolderId: '1E_Fm9Nq4lwHgwTGAIilVvije0RkHndgs',
    directoryFolderId: '1h4xQ-uxN7f7rZJKJiq0yH_Xjz4WOfctR',
    spreadsheetId: '',
    newsHeadInterval: 5,
    maxNewsHead: 5,
    themeDays: 3,
    themes: ['pale-meka', 'sky-city']
  }
})

const status = ref('Memuat data...')
const isUploading = ref(false)

async function load() {
  try {
    const data = await rpc('getAdminData', ...adminArgs())
    Object.assign(state, data)
    if (!state.broadcast) state.broadcast = data.news || []
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

async function handleFileUpload(event, item, fieldName, targetType, folderId) {
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
      targetType,
      targetField: fieldName,
      folderId
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

function addNewsHead() {
  state.newsHead.push({
    id: crypto.randomUUID(),
    title: 'News Head Baru',
    subtitle: 'Deskripsi singkat news head...',
    imageUrl: '',
    linkUrl: 'https://',
    buttonText: 'EXPLORE ARTIFACT →',
    active: true
  })
}

function addBroadcast() {
  state.broadcast.push({
    id: crypto.randomUUID(),
    title: 'Pesan Broadcast',
    body: 'Tulis isi pengumuman...',
    imageUrl: '',
    active: true
  })
}

function addLink() {
  state.links.push({
    id: crypto.randomUUID(),
    label: 'Link baru',
    url: 'https://',
    icon: '❖',
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
              <textarea v-model="state.profile.bio" class="admin-textarea" rows="3" placeholder="Deskripsi portal"></textarea>
            </div>
            <div class="admin-field">
              <label>Background Image URL</label>
              <div class="admin-inline-input">
                <input v-model="state.profile.bgUrl" class="admin-input" style="flex: 1;" placeholder="https://lh3.googleusercontent.com/d/...">
                <label class="upload-icon-btn">
                  <span>📁 UPLOAD</span>
                  <input type="file" accept="image/*" style="display: none;" @change="handleFileUpload($event, null, 'bgUrl', 'bg', state.settings.driveFolderId)" :disabled="isUploading">
                </label>
              </div>
            </div>
          </section>

          <!-- Storage & Google Spreadsheet Database Settings -->
          <section class="admin-card">
            <h2 class="meka-eyebrow" style="font-size: 12px; margin-bottom: 16px;">02 // GOOGLE DRIVE & SPREADSHEET DB</h2>
            <div class="admin-field">
              <label>Google Spreadsheet ID (Database Sync)</label>
              <input v-model="state.settings.spreadsheetId" class="admin-input" placeholder="Spreadsheet ID untuk sync database">
            </div>
            <div class="admin-field">
              <label>Folder ID Background</label>
              <input v-model="state.settings.driveFolderId" class="admin-input" placeholder="1LNmKXbmfF8Y8L7rBBjWUlBunju9qMflR">
            </div>
            <div class="admin-field">
              <label>Folder ID News Head</label>
              <input v-model="state.settings.newsHeadFolderId" class="admin-input" placeholder="1E_Fm9Nq4lwHgwTGAIilVvije0RkHndgs">
            </div>
            <div class="admin-field">
              <label>Folder ID Directory</label>
              <input v-model="state.settings.directoryFolderId" class="admin-input" placeholder="1h4xQ-uxN7f7rZJKJiq0yH_Xjz4WOfctR">
            </div>
          </section>

          <!-- News Head Slider Manager -->
          <section class="admin-card admin-grid-full">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
              <div>
                <h2 class="meka-eyebrow" style="font-size: 12px; margin: 0;">03 // NEWS HEAD SLIDER</h2>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <label style="font-family: var(--font-mono); font-size: 11px; display: flex; align-items: center; gap: 6px; color: var(--color-navy-cyan);">
                  Rolling (detik):
                  <input v-model.number="state.settings.newsHeadInterval" type="number" min="1" max="60" class="admin-input" style="width: 55px; padding: 4px 8px; text-align: center;">
                </label>
                <label style="font-family: var(--font-mono); font-size: 11px; display: flex; align-items: center; gap: 6px; color: var(--color-navy-cyan);">
                  Max Tampil:
                  <input v-model.number="state.settings.maxNewsHead" type="number" min="1" max="20" class="admin-input" style="width: 55px; padding: 4px 8px; text-align: center;">
                </label>
                <button class="btn-cyan" @click="addNewsHead">+ TAMBAH NEWS HEAD</button>
              </div>
            </div>

            <div v-for="(nh, i) in state.newsHead" :key="nh.id" style="padding: 14px 0; border-top: 1px solid var(--color-soft-gray-border); display: flex; flex-direction: column; gap: 10px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 10px; align-items: center;">
                <input v-model="nh.title" class="admin-input" placeholder="Judul News Head">
                <input v-model="nh.subtitle" class="admin-input" placeholder="Deskripsi / Subtitle">
                <input v-model="nh.linkUrl" class="admin-input" placeholder="Link URL Target">
                <input v-model="nh.buttonText" class="admin-input" placeholder="Teks Tombol (e.g. EXPLORE →)">
                <button class="btn-danger" @click="state.newsHead.splice(i, 1)">HAPUS</button>
              </div>

              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="admin-inline-input" style="flex: 1;">
                  <input v-model="nh.imageUrl" class="admin-input" style="flex: 1; font-size: 12px;" placeholder="URL Gambar Slide">
                  <label class="upload-icon-btn">
                    <span>📁 UPLOAD GAMBAR SLIDE</span>
                    <input type="file" accept="image/*" style="display: none;" @change="handleFileUpload($event, nh, 'imageUrl', 'newsHead', state.settings.newsHeadFolderId)" :disabled="isUploading">
                  </label>
                </div>
                <label style="font-family: var(--font-mono); font-size: 11px; color: var(--color-navy-cyan); white-space: nowrap;">
                  <input v-model="nh.active" type="checkbox"> Aktif
                </label>
              </div>
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

          <!-- Directory Links Editor -->
          <section class="admin-card admin-grid-full">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div>
                <h2 class="meka-eyebrow" style="font-size: 12px; margin: 0;">05 // DIRECTORY LINKS</h2>
              </div>
              <button class="btn-cyan" @click="addLink">+ TAMBAH DIRECTORY LINK</button>
            </div>

            <div v-for="(l, i) in state.links" :key="l.id" style="padding: 14px 0; border-top: 1px solid var(--color-soft-gray-border); display: flex; flex-direction: column; gap: 10px;">
              <div style="display: grid; grid-template-columns: 60px 1.5fr 2fr auto; gap: 10px; align-items: center;">
                <input v-model="l.icon" class="admin-input" style="text-align: center;" placeholder="Icon">
                <input v-model="l.label" class="admin-input" placeholder="Nama Label Direktori">
                <input v-model="l.url" class="admin-input" placeholder="https://...">
                <button class="btn-danger" @click="state.links.splice(i, 1)">HAPUS</button>
              </div>

              <div style="display: flex; align-items: center; gap: 12px;">
                <div class="admin-inline-input" style="flex: 1;">
                  <input v-model="l.imageUrl" class="admin-input" style="flex: 1; font-size: 12px;" placeholder="URL Gambar Directory Showcase">
                  <label class="upload-icon-btn">
                    <span>📁 UPLOAD GAMBAR SHOWCASE</span>
                    <input type="file" accept="image/*" style="display: none;" @change="handleFileUpload($event, l, 'imageUrl', 'directory', state.settings.directoryFolderId)" :disabled="isUploading">
                  </label>
                </div>
                <label style="font-family: var(--font-mono); font-size: 11px; color: var(--color-navy-cyan); white-space: nowrap;">
                  <input v-model="l.active" type="checkbox"> Aktif
                </label>
              </div>
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
