<template>
  <div id="app" class="min-h-screen bg-background">
    <!-- Layout with header + nav for authenticated routes -->
    <template v-if="showLayout">
      <GameHeader />
      <NavigationBar />
      <main>
        <RouterView />
      </main>
    </template>

    <!-- No layout for login screen -->
    <template v-else>
      <RouterView />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import GameHeader from '@/components/layout/GameHeader.vue'
import NavigationBar from '@/components/layout/NavigationBar.vue'

const route = useRoute()

// Show layout for all authenticated routes (not login)
const showLayout = computed(() => route.name !== 'Login')
</script>

<style>
@import './styles/globals.css';
</style>
