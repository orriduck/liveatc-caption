import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initThemePreference } from './utils/theme.js'

initThemePreference()

const app = createApp(App)

app.use(router)

app.mount('#app')
