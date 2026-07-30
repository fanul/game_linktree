import { createMemoryHistory, createRouter } from 'vue-router'
import AdminPage from './views/AdminPage.vue'
import LandingPage from './views/LandingPage.vue'

export default createRouter({
  history: createMemoryHistory('/'),
  routes: [
    { path: '/', component: LandingPage },
    { path: '/admin', component: AdminPage }
  ]
})
