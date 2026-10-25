import assert from 'node:assert/strict'
import test from 'node:test'
import { createBrowserHistoryGateway } from '../../src/app/navigation/browserHistoryGateway.js'

function createWindowStub() {
  const calls = []
  return {
    calls,
    location: {
      href: 'http://localhost/#about',
      origin: 'http://localhost'
    },
    history: {
      length: 4,
      state: { existing: true },
      scrollRestoration: 'auto',
      pushState(state, title, href) {
        calls.push(['pushState', state, title, href])
      },
      replaceState(state, title, href) {
        calls.push(['replaceState', state, title, href])
      }
    }
  }
}

test('History Gateway 只写入当前文档内的 hash 状态', () => {
  const windowRef = createWindowStub()
  const gateway = createBrowserHistoryGateway({ windowRef })

  gateway.push('/#games', { homeSection: 'games' })
  gateway.replace('/#links', { homeSection: 'links' })

  assert.deepEqual(windowRef.calls, [
    ['pushState', { homeSection: 'games' }, '', '/#games'],
    ['replaceState', { homeSection: 'links' }, '', '/#links']
  ])
})

test('History Gateway 拒绝跨文档写入并保留滚动恢复设置', () => {
  const windowRef = createWindowStub()
  const gateway = createBrowserHistoryGateway({ windowRef })

  assert.throws(
    () => gateway.push('/games/example/', {}),
    /当前文档内/
  )
  assert.equal(gateway.getLength(), 4)
  assert.equal(gateway.getScrollRestoration(), 'auto')
  gateway.setScrollRestoration('manual')
  assert.equal(windowRef.history.scrollRestoration, 'manual')
})
