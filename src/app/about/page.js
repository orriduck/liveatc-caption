import { Github, Info, X } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-atc-bg text-atc-text">
      <div className="mx-auto mt-20 w-full max-w-xl rounded-2xl border border-atc-line bg-atc-card p-8 shadow-sm">
        <div className="mb-10 flex items-center gap-4">
          <div className="rounded-2xl border border-atc-line-strong p-3 shadow-2xl">
            <Info className="h-6 w-6" />
          </div>
          <h1 className="text-3xl uppercase">About</h1>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl uppercase">ADSBao</h2>
            <p className="text-sm leading-relaxed text-atc-dim">
              ADSBao is an airport explorer focused on airport lookup, weather
              context, and nearby traffic visualization.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-atc-line p-4">
              <span className="mb-1 block text-[10px] uppercase text-atc-faint">
                Version
              </span>
              <span className="text-sm">0.8.0 - Next.js Web</span>
            </div>
            <div className="rounded-2xl border border-atc-line p-4">
              <span className="mb-1 block text-[10px] uppercase text-atc-faint">
                Focus
              </span>
              <span className="text-sm">Maps · Weather · Traffic</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-atc-line pt-8">
            <a
              href="https://github.com/orriduck/ADSBao"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between rounded-2xl border border-atc-line p-4 transition-all hover:bg-atc-elev"
            >
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-atc-dim transition-colors group-hover:text-atc-text" />
                <span className="text-sm text-atc-dim transition-colors group-hover:text-atc-text">
                  Source Code
                </span>
              </div>
              <X className="h-4 w-4 rotate-45 text-atc-faint" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
