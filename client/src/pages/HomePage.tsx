import { useEarthquakeStore } from "../store/earthquakeStore";
import { EarthquakeList } from "../components/ui/EarthquakeList";

export default function HomePage() {
  const earthquakes = useEarthquakeStore((s) => s.earthquakes);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Bosh sahifa</h1>
      <p className="text-gray-400 mb-8">
        Oxirgi zilzila tadbirlari va tizim holati.
      </p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">So'nggi zilzilalar</h2>
        </div>
        <EarthquakeList earthquakes={earthquakes.slice(0, 20)} />
      </div>
    </main>
  );
}
