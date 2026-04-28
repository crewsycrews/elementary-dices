import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import { initializeLocale } from "./i18n";

const app = createApp(App)
initializeLocale();

app.use(pinia)
app.use(router)

app.mount('#app')

console.log('🎮 Elementary Dice - Vue 3 app started!')
