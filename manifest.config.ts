import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from './package.json' with { type: 'json' }

export default defineManifest(({ mode }) => {
  const isFirefox = mode === 'firefox'
  const firefoxSettings = {
    browser_specific_settings: {
      gecko: {
        id: '{94702f88-02ef-4fed-8fd5-997e8cc1efe8}',
        strict_min_version: '142.0',
        data_collection_permissions: {
          required: ['none'] as ['none'],
        },
      },
    },
  }

  return {
    manifest_version: 3,
    name: 'Video Speed Shortcuts',
    short_name: 'Video Speed',
    version: packageJson.version,
    description: 'Control HTML5 video speed on any website with customizable shortcuts.',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    permissions: ['storage', 'scripting'],
    host_permissions: ['<all_urls>'],
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    background: isFirefox
      ? {
          scripts: ['src/background.ts'],
          persistent: false,
        }
      : {
          service_worker: 'src/background.ts',
          type: 'module',
        },
    action: {
      default_popup: 'popup.html',
      default_title: 'Open Video Speed Shortcuts popup',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
      },
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['src/content/index.ts'],
        run_at: 'document_start',
        all_frames: true,
        match_about_blank: true,
      },
    ],
    ...(isFirefox ? firefoxSettings : { minimum_chrome_version: '111' }),
  }
})
