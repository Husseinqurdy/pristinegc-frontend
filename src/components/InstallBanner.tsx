import { AnimatePresence, motion } from 'framer-motion'
import { Download, Share, MoreVertical, X } from 'lucide-react'
import { dismissInstall, promptInstall, useInstall } from '../utils/install'

/** Bottom card that helps people install the app on their phone. */
export default function InstallBanner() {
  const { mode, dismissed } = useInstall()
  const visible = !dismissed && (mode === 'prompt' || mode === 'ios' || mode === 'manual')

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-96 z-[60] bg-white border border-navy-100 shadow-xl rounded-2xl p-4"
          role="dialog" aria-label="Install Pristine Books"
        >
          <button onClick={dismissInstall} className="absolute top-2.5 right-2.5 text-slate-ink hover:text-navy-900" aria-label="Not now">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 pr-5">
            <img src="/pwa-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-navy-950">Install Pristine Books</p>

              {mode === 'prompt' && (
                <>
                  <p className="text-slate-ink mt-0.5 mb-3">Open it from your home screen like any app, and keep recording even without internet.</p>
                  <button
                    onClick={() => promptInstall()}
                    className="inline-flex items-center gap-2 bg-navy-900 text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Install
                  </button>
                </>
              )}

              {mode === 'ios' && (
                <p className="text-slate-ink mt-0.5">
                  In <strong>Safari</strong>, tap <Share className="w-4 h-4 inline -mt-0.5" /> <strong>Share</strong>, then
                  choose <strong>Add to Home Screen</strong>.
                </p>
              )}

              {mode === 'manual' && (
                <>
                  <p className="text-slate-ink mt-0.5">
                    In <strong>Chrome</strong>, tap <MoreVertical className="w-4 h-4 inline -mt-0.5" /> (top right), then
                    <strong> Install app</strong> or <strong>Add to Home screen</strong>.
                  </p>
                  <p className="text-slate-ink mt-2 text-xs">
                    Don't see it? If you opened this link from WhatsApp or another app, open it in Chrome first
                    (menu → <em>Open in Chrome</em>).
                  </p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
