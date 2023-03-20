import type { Tabs } from 'webextension-polyfill'
import browser from 'webextension-polyfill'
import { onMessage, sendMessage } from 'webext-bridge'
import { resetCss } from './resetWebsiteStyle'
import { setupAllAPIs } from './apis'

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log('Extension installed')
})

let previousTabId = 0

// communication example: send previous tab title from background page
// see shim.d.ts for type declaration
browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId
    return
  }

  let tab: Tabs.Tab

  try {
    tab = await browser.tabs.get(previousTabId)
    previousTabId = tabId
  }
  catch {
    return
  }

  // eslint-disable-next-line no-console
  console.log('previous tab', tab)
  sendMessage('tab-prev', { title: tab.title }, { context: 'content-script', tabId })
})

onMessage('get-current-tab', async () => {
  try {
    const tab = await browser.tabs.get(previousTabId)
    return {
      title: tab?.title,
    }
  }
  catch {
    return {
      title: undefined,
    }
  }
})

// preinsert css
browser.tabs.onUpdated.addListener((tabId: number, changInfo: Tabs.OnUpdatedChangeInfoType, tab: Tabs.Tab) => {
  if (
    /https?:\/\/bilibili.com\/?$/.test(`${tab.url}`)
    || /https?:\/\/www.bilibili.com\/?$/.test(`${tab.url}`)
    || /https?:\/\/bilibili.com\/\?spm_id_from=.*/.test(`${tab.url}`)
    || /https?:\/\/www.bilibili.com\/\?spm_id_from=(.)*/.test(`${tab.url}`)
    // || /https?:\/\/(www.)?bilibili.com\/video\/.*/.test(`${tab.url}`)
  ) {
    browser.scripting.insertCSS({
      css: resetCss,
      target: {
        tabId,
      },
    })

    if (changInfo.status === 'loading') {
      // const css = `
      // body {
      //   opacity: 0;
      //   transition: opacity 0.5s;
      //   overflow-y: hidden;
      //   pointer-events: none;
      // }
      // `

      browser.scripting.insertCSS({
        css: `
        body {
            opacity: 0;
            transition: opacity 0.5s;
            overflow-y: hidden;
            pointer-events: none;
        }
        `,
        target: {
          tabId,
        },
      })
      // setTimeout(() => {
      //   browser.scripting.insertCSS({
      //     css: `
      //     body {
      //         opacity: 1;
      //         overflow-y: auto;
      //         pointer-events: auto;
      //     }
      //     `,
      //     target: { tabId },
      //   })
      // }, 2000)

      // If it not a macOS, we will inject CSS to design the scrollbar
      if (!navigator.userAgent.includes('Mac OS X')) {
        browser.scripting.insertCSS({
          css: `
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }

            ::-webkit-scrollbar-track {
              background: transparent;
            }

            html > ::-webkit-scrollbar-track {
              background: var(--bew-bg);
            }

            ::-webkit-scrollbar-thumb {
              background-color: var(--bew-fill-3);
              border-radius: 20px;
            }

            ::-webkit-scrollbar-corner {
              background: var(--bew-bg)
            }
          `,
          // runAt: 'document_start',
          target: { tabId },
          // matchAboutBlank: true,
        })
      }
    }
    else if (changInfo.status === 'complete') {
      const css = `
      body {
        opacity: 1;
        overflow-y: auto;
        pointer-events: auto;
      }
      `

      browser.scripting.insertCSS({
        css,
        target: { tabId },
      })
    }
  }
})

// Setup APIs
setupAllAPIs()
