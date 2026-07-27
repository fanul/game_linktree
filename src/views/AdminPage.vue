<script setup>
import { onMounted, reactive, ref } from 'vue'
import { adminArgs, rpc } from '../services/rpc.js'
const key = ref(sessionStorage.getItem('adminKey') || '')
const state = reactive({ profile: {}, news: [], links: [], settings: { driveFolderId: '', spreadsheetId: '', themeDays: 3, themes: ['neon','fantasy','space'] } })
const status = ref('Masukkan admin key dari Script Properties.')
async function load() { sessionStorage.setItem('adminKey', key.value); try { Object.assign(state, await rpc('getAdminData', ...adminArgs())); status.value = 'Data dimuat.' } catch(e) { status.value = e.message } }
async function save() { try { await rpc('saveAdminData', ...adminArgs(JSON.parse(JSON.stringify(state)))); status.value = 'Tersimpan.' } catch(e) { status.value = e.message } }
function addNews(){ state.news.push({ id: crypto.randomUUID(), title:'Berita baru', body:'Tulis berita…', imageUrl:'', active:true }) }
function addLink(){ state.links.push({ id: crypto.randomUUID(), label:'Link baru', url:'https://', icon:'🎮', active:true }) }
onMounted(() => { if (key.value) load() })
</script>
<template><main class="admin"><header><div><p class="eyebrow">GAME LINKTREE</p><h1>Admin Studio</h1><small>Admin: fanul.doang@gmail.com</small></div><router-link to="/">Lihat landing</router-link></header>
<section class="card login"><input v-model="key" type="password" placeholder="Admin key"><button @click="load">Masuk / Muat</button><span>{{ status }}</span></section>
<section class="grid"><article class="card"><h2>Profil</h2><label>Judul<input v-model="state.profile.title"></label><label>Bio<textarea v-model="state.profile.bio"></textarea></label><label>URL avatar<input v-model="state.profile.avatarUrl"></label></article>
<article class="card"><h2>Penyimpanan Google</h2><label>Drive Folder ID<input v-model="state.settings.driveFolderId"></label><label>Spreadsheet ID<input v-model="state.settings.spreadsheetId"></label></article>
<article class="card wide"><div class="section-title"><h2>News ticker + WYSIWYG</h2><button @click="addNews">+ Berita</button></div><div v-for="(n,i) in state.news" :key="n.id" class="editor"><input v-model="n.title" placeholder="Judul"><div class="wysiwyg" contenteditable @input="n.body=$event.target.innerHTML" v-html="n.body"></div><input v-model="n.imageUrl" placeholder="URL gambar"><label class="check"><input v-model="n.active" type="checkbox"> Aktif</label><button class="danger" @click="state.news.splice(i,1)">Hapus</button></div></article>
<article class="card wide"><div class="section-title"><h2>Links</h2><button @click="addLink">+ Link</button></div><div v-for="(l,i) in state.links" :key="l.id" class="row"><input v-model="l.icon" class="icon"><input v-model="l.label"><input v-model="l.url"><label class="check"><input v-model="l.active" type="checkbox"> Aktif</label><button class="danger" @click="state.links.splice(i,1)">×</button></div></article>
<article class="card"><h2>Rolling tema</h2><label>Daftar tema (pisahkan koma)<input :value="state.settings.themes.join(',')" @change="state.settings.themes=$event.target.value.split(',').map(x=>x.trim()).filter(Boolean)"></label><label>Ganti setiap (hari)<input v-model.number="state.settings.themeDays" type="number" min="1" max="365"></label></article></section>
<button class="save" @click="save">Simpan semua</button></main></template>
