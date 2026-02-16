interface DownloadBoardParams {
  title: string
  elements: string
  appState: string
  files: string | null
}

export function downloadBoard({ title, elements, appState, files }: DownloadBoardParams) {
  const data = {
    type: "excalidraw",
    version: 2,
    elements: JSON.parse(elements),
    appState: JSON.parse(appState),
    files: files ? JSON.parse(files) : {},
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${title}.excalidraw`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
