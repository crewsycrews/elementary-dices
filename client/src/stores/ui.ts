import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // Loading state
  const isLoading = ref(false)
  const loadingMessage = ref<string>('')

  // Error state
  const error = ref<string | null>(null)

  // Toast notifications
  const toasts = ref<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([])

  // Modal state
  const activeModal = ref<'shop' | 'evolution' | 'battle' | null>(null)

  // Actions
  function setLoading(loading: boolean, message = '') {
    isLoading.value = loading
    loadingMessage.value = message
  }

  function showError(message: string) {
    error.value = message
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      if (error.value === message) {
        error.value = null
      }
    }, 5000)
  }

  function clearError() {
    error.value = null
  }

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = `toast-${Date.now()}-${Math.random()}`
    toasts.value.push({ id, message, type })

    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }

  function removeToast(id: string) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function openModal(modal: 'shop' | 'evolution' | 'battle') {
    activeModal.value = modal
  }

  function closeModal() {
    activeModal.value = null
  }

  return {
    // State
    isLoading,
    loadingMessage,
    error,
    toasts,
    activeModal,
    // Actions
    setLoading,
    showError,
    clearError,
    showToast,
    removeToast,
    openModal,
    closeModal,
  }
})
