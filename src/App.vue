<script setup lang="ts">
import MainLayout from './layouts/MainLayout.vue'
import { Toaster } from '@/components/ui/toast'
</script>

<template>
  <div id="app" class="h-screen w-screen overflow-hidden bg-background text-foreground">
    <MainLayout />
    <Toaster />
  </div>
</template>

<style>
@import './assets/styles/index.css';
</style>

