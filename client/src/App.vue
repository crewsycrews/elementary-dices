<template>
  <div id="app" class="min-h-screen bg-background">
    <!-- Full-screen views - no navigation bar -->
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<style>
@import './styles/globals.css';
</style>
