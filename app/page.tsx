"use client"

import { useState, useRef, useEffect } from "react"

// Modelos disponibles — todos corren 100% en el browser via WebAssembly/WebGPU
const MODELS = [
  {
    id: "Xenova/Phi-3-mini-4k-instruct",
    name: "Phi-3 Mini (recomendado)",
    size: "~500MB",
    description: "El mejor balance calidad/tamaño. Necesita WebGPU o descarga ~500MB.",
  },
  {
    id: "Xenova/distilgpt2",
    name: "DistilGPT-2 (rápido)",
    size: "~80MB",
    description: "Modelo liviano, respuestas simples. Ideal para probar rápido.",
  },
  {
    id: "Xenova/LaMini-Flan-T5-783M",
    name: "LaMini-T5 (instrucciones)",
    size: "~300MB",
    description: "Bueno para seguir instrucciones. Basado en T5.",
  },
]

type Status = "idle" | "loading" | "ready" | "generating" | "error"

export default function Home() {
  const [status, setStatus] = useState<Status>("idle")
  const [selectedModel, setSelectedModel] = useState(MODELS[1].id)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadStatus, setLoadStatus] = useState("")
  const [prompt, setPrompt] = useState("")
  const [output, setOutput] = useState("")
  const [maxTokens, setMaxTokens] = useState(200)
  const [error, setError] = useState("")
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    // Crear el worker al montar el componente
    workerRef.current = new Worker(new URL("../lib/worker.ts", import.meta.url), {
      type: "module",
    })

    workerRef.current.onmessage = (event) => {
      const { type } = event.data

      if (type === "loading") {
        setLoadProgress(Math.round(event.data.progress * 100))
        setLoadStatus(event.data.status || "Descargando modelo...")
      }
      if (type === "ready") {
        setStatus("ready")
        setLoadProgress(100)
      }
      if (type === "token") {
        setOutput(event.data.text)
      }
      if (type === "done") {
        setStatus("ready")
      }
      if (type === "error") {
        setError(event.data.message)
        setStatus("error")
      }
    }

    return () => workerRef.current?.terminate()
  }, [])

  function loadModel() {
    if (!workerRef.current) return
    setStatus("loading")
    setLoadProgress(0)
    setError("")
    workerRef.current.postMessage({ type: "load", model: selectedModel })
  }

  function generate() {
    if (!workerRef.current || status !== "ready") return
    setStatus("generating")
    setOutput("")
    workerRef.current.postMessage({ type: "generate", text: prompt, maxTokens })
  }

  const model = MODELS.find(m => m.id === selectedModel)!

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 32 }}>🧠</span>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
              LLM en el Browser
            </h1>
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6 }}>
            Un modelo de lenguaje corriendo 100% en tu browser — sin servidor, sin API, sin costo.
            El modelo se descarga una vez y queda cacheado.{" "}
            <a href="https://juanchi.dev/blog/llm-pequeno-browser-edge-inferencia-nextjs"
              style={{ color: "#06b6d4" }} target="_blank" rel="noopener noreferrer">
              Leer el post →
            </a>
          </p>
        </div>

        {/* Selector de modelo */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Modelo
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {MODELS.map(m => (
              <label key={m.id} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
                borderRadius: 10, cursor: "pointer", transition: "background 0.2s",
                background: selectedModel === m.id ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${selectedModel === m.id ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.08)"}`,
              }}>
                <input type="radio" value={m.id} checked={selectedModel === m.id}
                  onChange={() => setSelectedModel(m.id)}
                  disabled={status === "loading" || status === "generating"}
                  style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{m.name} <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400, fontSize: 13 }}>{m.size}</span></div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{m.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Cargar modelo */}
        {status === "idle" && (
          <button onClick={loadModel} style={{
            width: "100%", padding: "14px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #06b6d4, #ec4899)", color: "white",
            fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 24,
          }}>
            Cargar {model.name}
          </button>
        )}

        {/* Progreso de carga */}
        {status === "loading" && (
          <div style={{ marginBottom: 24, padding: "20px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.7)" }}>{loadStatus || "Descargando modelo..."}</span>
              <span style={{ color: "#06b6d4", fontWeight: 700 }}>{loadProgress}%</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3 }}>
              <div style={{ height: "100%", width: `${loadProgress}%`, background: "linear-gradient(90deg, #06b6d4, #ec4899)", borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "8px 0 0" }}>
              Primera vez tarda más — después queda cacheado en tu browser.
            </p>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div style={{ marginBottom: 24, padding: 16, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            <strong>Error:</strong> {error}
            <br /><button onClick={() => setStatus("idle")} style={{ marginTop: 8, background: "none", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>
              Reintentar
            </button>
          </div>
        )}

        {/* Área de prompt */}
        {(status === "ready" || status === "generating") && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                disabled={status === "generating"}
                placeholder="Escribí tu prompt acá..."
                rows={4}
                style={{
                  width: "100%", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)", color: "white", fontSize: 15,
                  resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                Max tokens: <strong style={{ color: "white" }}>{maxTokens}</strong>
              </label>
              <input type="range" min={50} max={500} value={maxTokens}
                onChange={e => setMaxTokens(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#06b6d4" }} />
            </div>

            <button onClick={generate} disabled={!prompt.trim() || status === "generating"}
              style={{
                width: "100%", padding: "14px", borderRadius: 10, border: "none",
                background: status === "generating" ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #06b6d4, #ec4899)",
                color: "white", fontSize: 16, fontWeight: 700,
                cursor: !prompt.trim() || status === "generating" ? "not-allowed" : "pointer",
                marginBottom: 24,
              }}>
              {status === "generating" ? "Generando..." : "Generar"}
            </button>

            {output && (
              <div>
                <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Output {status === "generating" && <span style={{ color: "#06b6d4" }}>● generando</span>}
                </label>
                <div style={{
                  padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", lineHeight: 1.7,
                  whiteSpace: "pre-wrap", minHeight: 100,
                }}>
                  {output}
                  {status === "generating" && <span style={{ animation: "pulse 1s infinite", color: "#06b6d4" }}>▋</span>}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          <span>by <a href="https://juanchi.dev" style={{ color: "#06b6d4" }}>juanchi.dev</a></span>
          <a href="https://github.com/JuanTorchia/browser-llm-demo" style={{ color: "rgba(255,255,255,0.3)" }} target="_blank" rel="noopener noreferrer">Ver código →</a>
        </div>
      </div>
    </main>
  )
}
