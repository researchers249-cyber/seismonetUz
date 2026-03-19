const SAFETY_TIPS = [
  {
    phase: "Oldin",
    tips: [
      "Uyingizda tebrankichga chidamli joylarni aniqlang (mustahkam stol, burchak devori).",
      "Favqulodda to'plamni tayyorlang: suv, ovqat, dori-darmon, fonar.",
      "Oila a'zolari bilan uchrashuv joyini oldindan belgilang.",
      "Uy jihozlarini devorlarga mahkamlang.",
    ],
  },
  {
    phase: "Davomida",
    tips: [
      "Yering, boshingizni himoyalang, mahkam ushlaning.",
      "Binolardan, derazalardan, og'ir narsalardan uzoqlashing.",
      "Lift ishlatmang — zinapoyadan tushing.",
      "Ochiq maydonga chiqolmasangiz, ichkarida qoling.",
    ],
  },
  {
    phase: "Keyin",
    tips: [
      "Gaz hidini his qilsangiz — kranni yoping va binodan chiqing.",
      "Shikastlangan binolarga kirmang.",
      "Rasmiy ma'lumotlarni kuting, mish-mishga ishonmang.",
      "Qutqaruvchilarga yo'l bering.",
    ],
  },
];

export default function SafetyPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Xavfsizlik</h1>
      <p className="text-gray-400 mb-8">Zilzila vaqtida xavfsiz bo'lish bo'yicha tavsiyalar.</p>

      <div className="grid gap-6 md:grid-cols-3">
        {SAFETY_TIPS.map(({ phase, tips }) => (
          <div
            key={phase}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-800 pb-3">
              {phase}
            </h2>
            <ul className="space-y-3">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
                  <span className="flex-shrink-0 mt-1 h-2 w-2 rounded-full bg-red-500" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
