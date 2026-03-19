import { useEarthquakeStore } from "../store/earthquakeStore";
import { EarthquakeList } from "../components/ui/EarthquakeList";

export default function EarthquakesPage() {
  const earthquakes = useEarthquakeStore((s) => s.earthquakes);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Zilzilalar</h1>
      <p className="text-gray-400 mb-8">
        Barcha qayd etilgan zilzila tadbirlari ({earthquakes.length} ta).
      </p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <EarthquakeList earthquakes={earthquakes} />
      </div>
    </main>
  );
}
