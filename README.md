# browser-llm-demo

Un LLM corriendo **100% en el browser** — sin servidor, sin API key, sin costo por token. El modelo se descarga una vez y queda cacheado en tu browser.

> 📖 Post completo: [Metí un LLM chico adentro de una app Next.js](https://juanchi.dev/blog/llm-pequeno-browser-edge-inferencia-nextjs)

## Demo en vivo

🔗 [browser-llm.juanchi.dev](https://browser-llm.juanchi.dev) *(próximamente)*

## ¿Cómo funciona?

```
Browser
  └── Next.js App
        └── Web Worker (hilo separado — no bloquea la UI)
              └── @huggingface/transformers
                    └── ONNX Runtime Web (WebAssembly / WebGPU)
                          └── Modelo LLM (descargado de HuggingFace CDN)
```

La clave es el **Web Worker**: el modelo corre en un hilo separado del main thread. Sin esto, la UI se congela completamente durante la inferencia.

## Modelos soportados

| Modelo | Tamaño | Calidad |
|--------|--------|---------|
| DistilGPT-2 | ~80MB | Básico, rápido |
| LaMini-Flan-T5-783M | ~300MB | Instrucciones |
| Phi-3 Mini 4K | ~500MB | El mejor, necesita WebGPU |

## Quick start

```bash
# Instalar dependencias
npm install

# Dev server
npm run dev

# Abrir http://localhost:3000
```

## Lo interesante del código

### Web Worker (`lib/worker.ts`)
```ts
// El modelo corre en un worker — no bloquea la UI
const generator = await pipeline("text-generation", "Xenova/distilgpt2")

// Streaming token a token
const output = await generator(prompt, {
  max_new_tokens: 200,
  callback_function: (beams) => {
    // Cada token se manda al main thread en tiempo real
    self.postMessage({ type: "token", text: partial })
  }
})
```

### Comunicación Worker ↔ UI
```ts
// Mandar trabajo al worker
worker.postMessage({ type: "generate", text: prompt })

// Recibir tokens en tiempo real
worker.onmessage = (event) => {
  if (event.data.type === "token") {
    setOutput(event.data.text) // actualiza la UI con cada token
  }
}
```

## Qué aprendí

- El primer render del modelo tarda — pero se **cachea** en `Cache API` del browser
- **WebGPU** es 5-10x más rápido que WebAssembly para inferencia
- Los modelos con **quantización int4/int8** son imprescindibles en el browser
- Separar inferencia en Web Worker es no-negociable para UX

## Autor

**Juan Torchia** — [juanchi.dev](https://juanchi.dev) — Nativo Digital
