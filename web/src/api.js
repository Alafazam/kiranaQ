// Fetch helper for the KiranaQ API. Throws on a non-2xx response.
export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, options)
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`)
  return res.json()
}
