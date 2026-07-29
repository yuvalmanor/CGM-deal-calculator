export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-xs font-bold text-white">CG</div>
          <span className="font-semibold text-gray-900">CGM Ventures</span>
          <span className="hidden text-gray-400 sm:inline">· Deal Calculator</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/" className="text-gray-500 hover:text-gray-900 transition">Deals</a>
          <a href="/deal/new" className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition">+ New Deal</a>
        </nav>
      </div>
    </header>
  )
}
