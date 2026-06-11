import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

const WEBHOOK_URLS = {
  prod: "https://pruebajupaca1.app.n8n.cloud/webhook/84b64a3c-99e3-4fc5-ae07-85ce3eabded7",
  test: "https://pruebajupaca1.app.n8n.cloud/webhook-test/84b64a3c-99e3-4fc5-ae07-85ce3eabded7",
} as const;
type Mode = keyof typeof WEBHOOK_URLS;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Procesar PDF · Subida rápida" },
      {
        name: "description",
        content:
          "Sube un PDF y recibe automáticamente el archivo de texto procesado por el flujo.",
      },
      { property: "og:title", content: "Procesar PDF · Subida rápida" },
      {
        property: "og:description",
        content:
          "Sube un PDF y recibe automáticamente el archivo de texto procesado por el flujo.",
      },
    ],
  }),
  component: Index,
});

type Status = "idle" | "uploading" | "done" | "error";

function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<{ url: string; name: string } | null>(
    null,
  );
  const [mode, setMode] = useState<Mode>("prod");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("El archivo debe ser un PDF.");
      setStatus("error");
      return;
    }
    setErrorMsg("");
    setStatus("idle");
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }, []);

  const upload = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    if (result) {
      URL.revokeObjectURL(result.url);
      setResult(null);
    }
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      fd.append("filename", file.name);
      const res = await fetch(WEBHOOK_URLS[mode], { method: "POST", body: fd });
      if (!res.ok) throw new Error(`El flujo respondió con código ${res.status}`);

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const match = cd.match(/filename\*?=(?:UTF-8'')?["]?([^;"\n]+)["]?/i);
      const baseName = file.name.replace(/\.pdf$/i, "");
      const name = match?.[1]
        ? decodeURIComponent(match[1])
        : `${baseName}-resultado.txt`;
      const url = URL.createObjectURL(blob);
      setResult({ url, name });
      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const busy = status === "uploading";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[image:var(--gradient-subtle)]">
      <div className="w-full max-w-xl">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-5">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Procesador de PDF
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
            Sube tu PDF
          </h1>
          <p className="mt-3 text-muted-foreground">
            El archivo se envía al flujo y recibirás el resultado en{" "}
            <span className="text-foreground font-medium">.txt</span> aquí mismo.
          </p>
        </header>

        <section
          className="rounded-2xl bg-card border border-border p-6 sm:p-8"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <div className="mb-6 flex items-center justify-center">
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              {(["prod", "test"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  disabled={busy}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-[var(--transition-smooth)] ${
                    mode === m
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "prod" ? "Producción" : "Test"}
                </button>
              ))}
            </div>
          </div>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`group relative flex flex-col items-center justify-center text-center cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 transition-[var(--transition-smooth)] ${
              dragging
                ? "border-primary bg-accent/60"
                : "border-border hover:border-primary/60 hover:bg-accent/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
              disabled={busy}
            />
            <div
              className="size-14 rounded-full flex items-center justify-center mb-4 text-primary-foreground"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            {file ? (
              <>
                <p className="text-foreground font-medium truncate max-w-full">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(1)} KB · haz clic para cambiar
                </p>
              </>
            ) : (
              <>
                <p className="text-foreground font-medium">
                  Arrastra tu PDF o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo archivos PDF
                </p>
              </>
            )}
          </label>

          {errorMsg && (
            <p className="mt-4 text-sm text-destructive text-center">
              {errorMsg}
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={upload}
              disabled={!file || busy}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-[var(--transition-smooth)] hover:opacity-95"
              style={{
                backgroundImage: "var(--gradient-primary)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              {busy ? (
                <>
                  <span className="size-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                  Procesando…
                </>
              ) : (
                <>Enviar y procesar</>
              )}
            </button>
            {(file || result || status === "error") && !busy && (
              <button
                type="button"
                onClick={reset}
                className="rounded-xl px-5 py-3 text-sm font-medium border border-border text-foreground hover:bg-accent transition-[var(--transition-smooth)]"
              >
                Limpiar
              </button>
            )}
          </div>

          {result && status === "done" && (
            <div className="mt-6 rounded-xl border border-border bg-accent/40 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Resultado listo
                </p>
                <p className="text-sm font-medium text-foreground truncate">
                  {result.name}
                </p>
              </div>
              <a
                href={result.url}
                download={result.name}
                className="shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 transition-[var(--transition-smooth)]"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar
              </a>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Procesamiento automático mediante el flujo conectado.
        </p>
      </div>
    </main>
  );
}
