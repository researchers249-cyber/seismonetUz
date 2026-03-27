import { LabMode } from "../types";

const LAB_TABS: { id: LabMode; label: string; description: string }[] = [
  { id: "electrostatics", label: "Elektrostatika", description: "Zaryadlar va maydonlar" },
  { id: "dc", label: "DC Zanjirlar", description: "Ohm/Kirxgof" },
  { id: "media", label: "Turli muhit", description: "Metall, elektrolit, gaz" },
  { id: "magnetism", label: "Magnetizm", description: "Lorentz va induksiya" },
  { id: "ac", label: "AC Zanjirlar", description: "Reaktans va transformator" },
  { id: "safety", label: "O'lchov va xavfsizlik", description: "Asboblar, himoya" },
];

interface LabTabsProps {
  active: LabMode;
  onChange: (mode: LabMode) => void;
}

export function LabTabs({ active, onChange }: LabTabsProps) {
  return (
    <div className="grid gap-2 md:grid-cols-6">
      {LAB_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-xl border px-3 py-3 text-left transition-colors ${
            active === tab.id
              ? "bg-sky-600/20 border-sky-500 text-white"
              : "bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-600"
          }`}
        >
          <div className="text-sm font-semibold">{tab.label}</div>
          <div className="text-xs text-gray-400">{tab.description}</div>
        </button>
      ))}
    </div>
  );
}
