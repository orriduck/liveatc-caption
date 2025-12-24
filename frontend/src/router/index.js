import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
    {
        path: '/',
        name: 'home',
        component: HomeView
    },
    {
        path: '/:icao',
        name: 'airport',
        component: HomeView
    },
    {
        path: '/:icao/:channel',
        name: 'channel',
        component: HomeView
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('../views/SettingsView.vue')
    },
    {
        path: '/about',
        name: 'about',
        component: () => import('../views/AboutView.vue')
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router
