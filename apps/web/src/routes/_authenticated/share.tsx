import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { client } from "@/utils/orpc"
import { decodeShareData } from "@/lib/share"
import Loader from "@/components/loader"

export const Route = createFileRoute("/_authenticated/share")({
  head: () => ({
    meta: [{ title: "Import Board | Zentis" }],
  }),
  component: SharePage,
})

function SharePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const hasImported = useRef(false)

  useEffect(() => {
    if (hasImported.current) return
    hasImported.current = true

    async function importBoard() {
      try {
        const hash = window.location.hash.slice(1)
        const params = new URLSearchParams(hash)
        const encoded = params.get("data")

        if (!encoded) {
          setError("No share data found in URL")
          return
        }

        const data = await decodeShareData(encoded)
        const { id } = await client.board.create({ title: data.title })

        await client.board.update({
          id,
          elements: data.elements,
          appState: data.appState,
          files: data.files,
        })

        await queryClient.invalidateQueries({ queryKey: ["boards"] })
        navigate({ to: "/board/$boardId", params: { boardId: id } })
      } catch {
        setError("Failed to import shared board")
      }
    }

    importBoard()
  }, [navigate, queryClient])

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader />
    </div>
  )
}
