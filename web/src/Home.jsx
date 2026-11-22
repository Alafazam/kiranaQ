import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function Home() {
  const [health, setHealth] = useState('checking...')

  useEffect(() => {
    api('/health')
      .then((data) => setHealth(JSON.stringify(data)))
      .catch((err) => setHealth(`error: ${err.message}`))
  }, [])

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-semibold">KiranaQ — stock logs</h1>
      <p className="mt-4 text-sm text-stone-600">Server health: {health}</p>
    </main>
  )
}
