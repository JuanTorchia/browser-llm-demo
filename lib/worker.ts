/**
 * Web Worker que corre el modelo LLM.
 * Separar del hilo principal es CLAVE — si el modelo corre en el main thread
 * la UI se congela completamente durante la inferencia.
 */
import { pipeline, env, type TextGenerationPipeline } from "@huggingface/transformers"

// Usar el modelo desde el CDN de Hugging Face — no necesitás hostearlo vos
env.allowLocalModels = false
env.useBrowserCache = true  // Cachea el modelo después de la primera descarga

type MessageData =
  | { type: "load"; model: string }
  | { type: "generate"; text: string; maxTokens: number }

let generator: TextGenerationPipeline | null = null

// The overloaded signature of pipeline() is too complex for tsc to infer
const loadTextGeneration = pipeline as (
  task: "text-generation",
  model: string,
  options: { progress_callback: (progress: { progress?: number; status: string }) => void },
) => Promise<TextGenerationPipeline>

self.addEventListener("message", async (event: MessageEvent<MessageData>) => {
  const { type } = event.data

  if (type === "load") {
    try {
      self.postMessage({ type: "loading", progress: 0 })

      // Phi-3 Mini 4K es un buen balance calidad/tamaño (~2.3GB pero con quantización ~500MB)
      generator = await loadTextGeneration("text-generation", event.data.model, {
        progress_callback: (progress: { progress?: number; status: string }) => {
          self.postMessage({ type: "loading", progress: progress.progress ?? 0, status: progress.status })
        },
      })

      self.postMessage({ type: "ready" })
    } catch (error) {
      self.postMessage({ type: "error", message: String(error) })
    }
  }

  if (type === "generate") {
    if (!generator) {
      self.postMessage({ type: "error", message: "Modelo no cargado" })
      return
    }

    try {
      const generationOptions = {
        max_new_tokens: event.data.maxTokens,
        temperature: 0.7,
        do_sample: true,
        // Streaming token a token
        callback_function: (beams: Array<{ output_token_ids: number[] }>) => {
          const partial = (generator as any).tokenizer.decode(
            beams[0].output_token_ids,
            { skip_special_tokens: true }
          )
          self.postMessage({ type: "token", text: partial })
        },
      }
      const output = await generator(event.data.text, generationOptions)

      self.postMessage({ type: "done", output })
    } catch (error) {
      self.postMessage({ type: "error", message: String(error) })
    }
  }
})
