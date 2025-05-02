<template>
  <v-container class="fill-height d-flex justify-center align-center">
    <v-card max-width="400" width="100%">
      <v-card-title class="text-center text-h5 py-4">勤怠管理ログイン</v-card-title>
      <v-card-text class="pa-4">
        <!-- Add username/password fields later if needed -->
        <v-btn block color="primary" size="large" @click="login">
          ログイン (デモ)
        </v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function login() {
  // Simple navigation for demo purposes
  router.push('/home');
}
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
