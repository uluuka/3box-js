#!/usr/bin/env node

const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

const ipfsOptions = {
  EXPERIMENTAL: {
    pubsub: true
  }
}

// Create IPFS instance
const ipfs = new IPFS(ipfsOptions)

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {
  const orbitdb = new OrbitDB(ipfs)
  let storeDBs = []

  console.log(await ipfs.id())

  const rootDB = await orbitdb.open('/orbitdb/QmRmxKAwz8a6nQ8g76qpJXexWyC8GVUbyPLVbjrDmdGxcr/1220cc95e42e47131043cb4bcc8585663f3dfa81c9a32724a5812155f6b18f91354f.root')
  const readyPromise = new Promise((resolve, reject) => {
    rootDB.events.on('ready', () => {
      rootDB.iterator({ limit: -1 }).collect().map(entry => {
        const odbAddress = entry.payload.value.odbAddress
        openDB(odbAddress)
      })
      resolve()
    })
  })
  rootDB.load()

  rootDB.events.on(
    'replicate.progress',
    (odbAddress, entryHash, entry, num, max) => {
      openDB(entry.payload.value.odbAddress)
      console.log('Replicating entry:', entryHash)
      console.log('On db:', odbAddress)
      if (num === max) {
        rootDB.events.on('replicated', () => {
          console.log('Fully replicated db:', odbAddress)
        })
      }
    }
  )
  await readyPromise

  async function openDB (address, onProgress = () => {}) {
    console.log('Opening db:', address)
    let db = await orbitdb.open(address)
    db.load()
    storeDBs.push(db)
    db.events.on(
      'replicate.progress',
      (odbAddress, entryHash, entry, num, max) => {
        onProgress(entry)
        console.log('Replicating entry:', entryHash)
        console.log('On db:', odbAddress)
        if (num === max) {
          db.events.on('replicated', () => {
            console.log('Fully replicated db:', odbAddress)
          })
        }
      }
    )
  }
})
