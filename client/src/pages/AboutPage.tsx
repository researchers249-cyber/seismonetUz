export default function AboutPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-6">Tizim haqida</h1>

      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-3">SEISMON nima?</h2>
          <p className="text-gray-300 leading-relaxed">
            SEISMON — real vaqtli zilzila erta ogohlantirish tizimi. IoT
            sensorlari, USGS va EMSC ma'lumot manbalari yordamida zilzilalarni
            kuzatadi va foydalanuvchilarga ogohlantirishlar yuboradi.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Texnologiyalar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Python 3.12", desc: "Backend til" },
              { label: "FastAPI", desc: "REST & WebSocket" },
              { label: "React 18", desc: "Frontend" },
              { label: "TypeScript", desc: "Tipe xavfsizligi" },
              { label: "Tailwind CSS", desc: "Stil" },
              { label: "Railway", desc: "Deploy" },
            ].map(({ label, desc }) => (
              <div
                key={label}
                className="bg-gray-800 rounded-lg px-4 py-3"
              >
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-3">Ma'lumot manbalari</h2>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
              <strong className="text-white">USGS</strong> — Amerika Geologiya
              Xizmati (global)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-400 flex-shrink-0" />
              <strong className="text-white">EMSC</strong> — Evropa O'rta Yer
              dengizi Seysmologiya Markazi
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
              <strong className="text-white">IoT qurilmalar</strong> — real vaqtli
              akselerometr signallari
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
