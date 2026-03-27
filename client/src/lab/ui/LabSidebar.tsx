import { COMPONENT_LIBRARY, COMPONENT_TYPES } from "../components/ComponentLibrary";
import { LabMode } from "../types";

interface LabSidebarProps {
  activeMode: LabMode;
  connectMode: boolean;
  onToggleConnect: () => void;
}

export function LabSidebar({ activeMode, connectMode, onToggleConnect }: LabSidebarProps) {
  const showComponents = activeMode === "dc" || activeMode === "ac" || activeMode === "safety";

  return (
    <aside className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Komponentlar</h3>
        <p className="text-xs text-gray-400">3D maydonga tortib qo'ying</p>
      </div>

      {showComponents ? (
        <div className="grid gap-2">
          {COMPONENT_TYPES.map((type) => {
            const definition = COMPONENT_LIBRARY[type];
            return (
              <div
                key={type}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("component-type", type);
                }}
                className="flex items-center justify-between gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 cursor-grab active:cursor-grabbing"
              >
                <span>{definition.icon}</span>
                <span className="flex-1">{definition.label}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: definition.color }} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-700 p-3 text-xs text-gray-400">
          Tanlangan laboratoriya rejimi uchun 3D ob'ektlar avtomatik yaratiladi. Parametrlarni o'ng paneldan sozlang.
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={onToggleConnect}
          className={`w-full rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            connectMode
              ? "bg-emerald-600 text-white"
              : "bg-gray-800 text-gray-200 hover:bg-gray-700"
          }`}
          disabled={!showComponents}
        >
          {connectMode ? "Ulash rejimi yoqilgan" : "Ulash rejimini yoqish"}
        </button>
        <p className="text-[11px] text-gray-500">
          Ulanish rejimida komponentlarning terminal tugunlariga ketma-ket bosib, simlarni chizing.
        </p>
      </div>
    </aside>
  );
}
