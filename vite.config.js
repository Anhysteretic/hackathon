import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'; // Or your framework's plugin

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' makes all env variables available, not just VITE_ ones.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()], // Or your framework's plugin
    server: {
      proxy: {
        // String shorthand for simple proxy
        // '/api': 'https://api.bfl.ai/v1',

        // Using the options configuration to add headers and rewrite the path
        '/api': {
          target: 'https://api.bfl.ai', // The target API server
          changeOrigin: true, // Needed for virtual hosted sites
          rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api from the start of the path
          configure: (proxy, options) => {
            // This function allows us to modify the proxy request before it's sent
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Add the API key header to the proxied request
              proxyReq.setHeader('x-key', env.BFL_API_KEY);
            });
          },
        },

        // '/replicate-api': {
        //   target: 'https://api.replicate.com', // The destination server
        //   changeOrigin: true,
        //   rewrite: (path) => path.replace(/^\/replicate-api/, ''), // Removes '/replicate-api'
        //   configure: (proxy, options) => {
        //     proxy.on('proxyReq', (proxyReq, req, res) => {
        //       // Securely adds your Replicate API token on the server-side
        //       proxyReq.setHeader('Authorization', `Bearer ${env.REPLICATE_API_TOKEN}`);
        //       proxyReq.setHeader('Prefer', 'wait');
        //     });
        //   },
        // },
        '/replicate-api': {
            target: 'https://api.replicate.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/replicate-api/, ''),
            configure: (proxy, options) => {
                proxy.on('proxyReq', (proxyReq, req, res) => {
                proxyReq.setHeader('Authorization', `Bearer ${env.REPLICATE_API_TOKEN}`);
                // proxyReq.setHeader('Prefer', 'wait'); // <-- DELETE THIS LINE
                });
            },
        },
      },
    },
  };
});