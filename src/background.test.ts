import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('background content-script bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('injects the content script into existing web tabs only on first install', async () => {
    let onInstalled: ((details: chrome.runtime.InstalledDetails) => void) | undefined
    const executeScript = vi.fn(async () => [])

    vi.stubGlobal('chrome', {
      action: {
        setIcon: vi.fn(async () => undefined),
        onClicked: { addListener: vi.fn() },
      },
      runtime: {
        onInstalled: {
          addListener: vi.fn((listener: (details: chrome.runtime.InstalledDetails) => void) => {
            onInstalled = listener
          }),
        },
        onStartup: { addListener: vi.fn() },
        openOptionsPage: vi.fn(async () => undefined),
      },
      scripting: { executeScript },
      storage: {
        sync: { get: vi.fn(async () => ({})) },
        onChanged: { addListener: vi.fn() },
      },
      tabs: {
        query: vi.fn(async () => [
          { id: 11, url: 'https://www.youtube.com/watch?v=1' },
          { id: 12, url: 'chrome://settings' },
          { url: 'https://example.com' },
        ]),
      },
    } as unknown as typeof chrome)

    await import('./background')
    onInstalled?.({ reason: 'update', previousVersion: '0.1.0' })
    expect(executeScript).not.toHaveBeenCalled()

    onInstalled?.({ reason: 'install' })
    await vi.waitFor(() => expect(executeScript).toHaveBeenCalledTimes(1))

    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 11, allFrames: true },
      files: [expect.any(String)],
    })
  })
})
