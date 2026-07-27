import { createRouter, createWebHashHistory } from 'vue-router'
import LandingPage from './views/LandingPage.vue'
import AdminPage from './views/AdminPage.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: LandingPage },
    { path: '/admin', component: AdminPage }
  ]
})
