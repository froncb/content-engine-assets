"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FilmIcon, Loader2, RefreshCw, Upload, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

const ACCEPT = ".mp4,.mov,video/mp4,video/quicktime";
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

type Existing =
  | { uploaded: false }
  | { uploaded: true; publicUrl: string; ext: "mp4" | "mov" };

export function UploadZone({
  company,
  bundleId,
  scheduledFor,
  existing,
}: {
  company: string;
  bundleId: string;
  scheduledFor: string;
  existing: Existing;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);

  const showDrop = !existing.uploaded || replaceMode;

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      setProgress(null);
      try {
        if (file.size > MAX_BYTES) {
          throw new Error(`File is ${(file.size / 1024 / 1024).toFixed(0)} MB — limit is 500 MB.`);
        }
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (ext !== "mp4" && ext !== "mov") {
          throw new Error("Only .mp4 and .mov files are accepted.");
        }

        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company,
            bundleId,
            ext,
            contentType: file.type || (ext === "mov" ? "video/quicktime" : "video/mp4"),
          }),
        });
        if (!presignRes.ok) {
          const body = await presignRes.json().catch(() => ({}));
          throw new Error(body.error || `presign failed (${presignRes.status})`);
        }
        const { uploadUrl, publicUrl } = (await presignRes.json()) as {
          uploadUrl: string;
          publicUrl: string;
        };

        // Stream the file to R2 with progress events.
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader(
            "Content-Type",
            file.type || (ext === "mov" ? "video/quicktime" : "video/mp4")
          );
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`R2 PUT failed (${xhr.status})`));
          });
          xhr.addEventListener("error", () => reject(new Error("network error during upload")));
          xhr.addEventListener("abort", () => reject(new Error("upload aborted")));
          xhr.send(file);
        });

        // Surface to server-side: refresh route, server will HEAD R2 again.
        setProgress(100);
        router.refresh();
        setReplaceMode(false);
        // small hint for the user that the public URL was returned
        void publicUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [bundleId, company, router]
  );

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  if (existing.uploaded && !replaceMode) {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-emerald-200 font-medium">Footage uploaded</p>
            <p className="text-xs text-emerald-300/80 mt-1">
              The engine will pick this up on{" "}
              <span className="text-emerald-100">{scheduledFor}</span> when{" "}
              <code className="text-accent">/run-daily</code> fires.
            </p>
            <p className="text-xs text-emerald-300/60 mt-1 break-all">
              {existing.publicUrl}
            </p>
            <button
              type="button"
              onClick={() => setReplaceMode(true)}
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-emerald-200 hover:text-emerald-100"
            >
              <RefreshCw size={11} />
              replace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {existing.uploaded && replaceMode ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 mb-3 text-sm">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
          <div className="flex-1">
            <p className="text-amber-100">
              Replacing the existing file. The engine uses the version present at run-time.
            </p>
            <button
              type="button"
              onClick={() => setReplaceMode(false)}
              className="text-xs text-amber-300 hover:text-amber-200 mt-1"
            >
              keep existing instead
            </button>
          </div>
        </div>
      ) : null}

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragOver
            ? "border-accent bg-accent/5"
            : "border-ink-700 bg-ink-900/60 hover:border-ink-600",
          busy && "pointer-events-none opacity-80"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.currentTarget.value = "";
          }}
        />
        {busy ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-accent animate-spin" size={20} />
            <p className="text-sm text-ink-100">
              Uploading{progress !== null ? ` · ${progress}%` : "…"}
            </p>
            {progress !== null ? (
              <div className="w-48 h-1.5 bg-ink-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="text-ink-300" size={20} />
            <p className="text-sm text-ink-100">
              Drag a <span className="text-accent">.mp4</span> or{" "}
              <span className="text-accent">.mov</span> here, or click to browse
            </p>
            <p className="text-xs text-ink-500 flex items-center gap-1.5">
              <FilmIcon size={11} />
              up to 500 MB · uploads directly to R2
            </p>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-400 mt-3">{error}</p>
      ) : (
        <p className="text-xs text-ink-500 mt-3">
          No footage yet — if you don&apos;t upload by run-time, the reel falls back to
          ElevenLabs voiceover + Remotion motion graphics.
        </p>
      )}
    </div>
  );
}
