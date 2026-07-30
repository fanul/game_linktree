import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from './views/LandingPage.vue'
import AdminPage from './views/AdminPage.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: LandingPage },
    { path: '/admin', component: AdminPage }
  ]
})
