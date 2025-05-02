import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:4002', // Forward all /socket.io requests to backend server at port 4002
        ws: true,  // Enable websocket proxying
        changeOrigin: true, // Change the origin of the host header to the target URL
      }
    }
  }
})

