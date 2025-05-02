import { createRouter, createWebHashHistory } from 'vue-router' // Use Hash History
import LoginView from '../views/LoginView.vue'
import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    redirect: '/login' // Redirect root to login page
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/home',
    name: 'Home',
    component: HomeView
    // Add route guard later if needed: meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(), // Use Hash History for GitHub Pages
  routes
})

// Optional: Navigation guard example (uncomment and adapt if needed)
// router.beforeEach((to, from, next) => {
//   const isAuthenticated = false; // Replace with actual auth check
//   if (to.matched.some(record => record.meta.requiresAuth) && !isAuthenticated) {
//     next('/login');
//   } else {
//     next();
//   }
// });

export default router
