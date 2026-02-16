import { client } from "@/utils/orpc"
import { toast } from "sonner"

interface SharePayload {
  title: string
  elements: string
  appState: string
  files: string | null
}

export async function encodeShareData(data: SharePayload): Promise<string> {
  const json = JSON.stringify(data)
  const encoder = new TextEncoder()
  const input = encoder.encode(json)

  const cs = new CompressionStream("deflate")
  const writer = cs.writable.getWriter()
  writer.write(input)
  writer.close()

  const reader = cs.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const compressed = new Uint8Array(
    chunks.reduce((acc, c) => acc + c.length, 0)
  )
  let offset = 0
  for (const chunk of chunks) {
    compressed.set(chunk, offset)
    offset += chunk.length
  }

  // base64url encode
  const base64 = btoa(String.fromCharCode(...compressed))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function decodeShareData(encoded: string): Promise<SharePayload> {
  // base64url decode
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
  while (base64.length % 4 !== 0) base64 += "="
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))

  const ds = new DecompressionStream("deflate")
  const writer = ds.writable.getWriter()
  writer.write(bytes)
  writer.close()

  const reader = ds.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const decompressed = new Uint8Array(
    chunks.reduce((acc, c) => acc + c.length, 0)
  )
  let offset = 0
  for (const chunk of chunks) {
    decompressed.set(chunk, offset)
    offset += chunk.length
  }

  const json = new TextDecoder().decode(decompressed)
  return JSON.parse(json) as SharePayload
}

export async function shareBoard(boardId: string) {
  try {
    const board = await client.board.get({ id: boardId })
    const encoded = await encodeShareData({
      title: board.title,
      elements: board.elements,
      appState: board.appState,
      files: board.files,
    })

    const url = `${window.location.origin}/share#data=${encoded}`

    if (url.length > 100_000) {
      toast.warning("Share link is very long and may not work in all browsers")
    }

    await navigator.clipboard.writeText(url)
    toast.success("Share link copied!")
  } catch {
    toast.error("Failed to create share link")
  }
}
