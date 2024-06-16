import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, expect, test, vi } from 'vitest'
import { createStorage } from 'unstorage'
import inspectItem from './../../../src/runtime/serverHandler/api/inspectItem'

mockNuxtImport('useRuntimeConfig', () => {
  return () => {
    return {
      multiCache: {},
    }
  }
})

vi.mock('h3', async () => {
  const h3: any = await vi.importActual('h3')
  return {
    ...h3,
    readBody: (event: any) => {
      return event.body
    },
  }
})

vi.mock('./../../../src/runtime/serverHandler/api/helpers', () => {
  return {
    checkAuth: () => {
      return Promise.resolve()
    },
    getCacheInstance: (event: any) => {
      const cache = event.__CACHE_NAME
      return event.context.__MULTI_CACHE[cache]
    },
  }
})

function doInspect(storage: any, cache: string, key: string) {
  return inspectItem({
    context: {
      __MULTI_CACHE: {
        [cache]: storage,
      },
      params: {
        cacheName: cache,
      },
    },
    path: `/api/inspect/${cache}?key=${key}`,
    node: {
      req: {
        url: `http://localhost:3000/api/inspect/${cache}?key=${key}`,
      },
    },
    __CACHE_NAME: cache,
  } as any)
}

describe('inspectItem API handler', () => {
  test('Returns details for a component cache item.', async () => {
    const storage = createStorage()
    storage.setItem('component1', '<div>Hello world</div>')
    storage.setItem('component2', { markup: '<div>Object OBJECT</div>' })

    expect(
      await doInspect(storage, 'component', 'component1'),
    ).toMatchInlineSnapshot('"<div>Hello world</div>"')

    expect(await doInspect(storage, 'component', 'component2'))
      .toMatchInlineSnapshot(`
      {
        "markup": "<div>Object OBJECT</div>",
      }
    `)
  })

  test('Returns details for a data cache item.', async () => {
    const storage = createStorage()
    storage.setItem('data1', 'My data')
    storage.setItem('data2', { data: 'My second data' })

    expect(await doInspect(storage, 'data', 'data1')).toMatchInlineSnapshot(
      '"My data"',
    )

    expect(await doInspect(storage, 'data', 'data2')).toMatchInlineSnapshot(`
      {
        "data": "My second data",
      }
    `)
  })

  test('Throws 404 if item is not found.', () => {
    const storage = createStorage()
    expect(
      doInspect(storage, 'data', 'foobar'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Cache item does not exist.]`,
    )
  })
})
