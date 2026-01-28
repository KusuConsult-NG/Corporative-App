import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import Button from './ui/Button'

export default function PWAUpdatePrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('✅ Service Worker registered:', r)
        },
        onRegisterError(error) {
            console.error('❌ Service Worker registration error:', error)
        },
    })

    const close = () => {
        setOfflineReady(false)
        setNeedRefresh(false)
    }

    const update = () => {
        updateServiceWorker(true)
    }

    if (!offlineReady && !needRefresh) {
        return null
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <RefreshCw className="text-blue-600 dark:text-blue-400" size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                        {offlineReady && (
                            <>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                                    App Ready for Offline Use
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    You can now use this app even without an internet connection!
                                </p>
                            </>
                        )}

                        {needRefresh && (
                            <>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                                    Update Available
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                    A new version of the app is available. Click reload to update.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={update}
                                        className="text-xs"
                                    >
                                        Reload
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={close}
                                        className="text-xs"
                                    >
                                        Later
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>

                    {offlineReady && (
                        <button
                            onClick={close}
                            className="flex-shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            aria-label="Close"
                        >
                            <X size={16} className="text-slate-500 dark:text-slate-400" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
