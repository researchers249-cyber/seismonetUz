export function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span className="text-white font-bold font-['Oswald'] tracking-wider">SEIS</span>
            <span className="text-red-500 font-bold font-['Oswald'] tracking-wider">MON</span>
            <span className="text-gray-500 ml-2 text-sm">© 2026</span>
          </div>
          <div className="text-gray-500 text-sm text-center">
            Zilzila Erta Ogohlantirish Tizimi
          </div>
          <div className="flex items-center gap-2 text-gray-600 text-xs">
            <span className="bg-gray-800 px-2 py-1 rounded font-mono">Python</span>
            <span className="text-gray-700">+</span>
            <span className="bg-gray-800 px-2 py-1 rounded font-mono">FastAPI</span>
            <span className="text-gray-700">+</span>
            <span className="bg-gray-800 px-2 py-1 rounded font-mono">Railway</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
