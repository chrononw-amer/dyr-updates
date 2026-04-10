import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscatorPlugin from 'rollup-plugin-obfuscator';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      plugins: [
        obfuscatorPlugin({
          options: {
            // Performance-safe settings (no runtime slowdown)
            compact: true,
            controlFlowFlattening: false,    // OFF = no speed impact
            deadCodeInjection: false,         // OFF = no bundle bloat
            debugProtection: false,           // OFF = won't freeze devtools
            disableConsoleOutput: false,      // Keep console for debugging
            identifierNamesGenerator: 'hexadecimal',
            renameGlobals: false,
            rotateStringArray: true,
            selfDefending: false,             // OFF = safer for Electron
            
            // Strong string protection
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayCallsTransformThreshold: 1,
            stringArrayEncoding: ['rc4'],     // RC4 = stronger than base64
            stringArrayIndexShift: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayWrappersCount: 2,
            stringArrayWrappersChainedCalls: true,
            stringArrayWrappersParametersMaxCount: 4,
            stringArrayWrappersType: 'function',
            stringArrayThreshold: 1,
            
            transformObjectKeys: true,
            unicodeEscapeSequence: false,
            log: false,
          },
        }),
      ],
    },
  },
})
