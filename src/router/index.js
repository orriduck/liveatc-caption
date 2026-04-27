import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
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
        redirect: to => ({ name: 'airport', params: { icao: to.params.icao } })
    },
    {
        path: '/about',
        name: 'about',
        component: () => import('../views/AboutView.vue')
    }
]

const router = createRouter({
    history: window.location.protocol === 'file:'
        ? createWebHashHistory(import.meta.env.BASE_URL)
        : createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router
