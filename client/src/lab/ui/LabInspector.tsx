import { COMPONENT_LIBRARY } from "../components/ComponentLibrary";
import { CircuitSolution, LabComponent, LabMode } from "../types";
import { MetricCard } from "./MetricCard";

interface Metric {
  label: string;
  value: string;
  tone?: "info" | "success" | "danger";
}

interface LabInspectorProps {
  mode: LabMode;
  selectedComponent: LabComponent | null;
  solution: CircuitSolution | null;
  onUpdateParam: (id: string, key: string, value: number | boolean) => void;
  metrics: Metric[];
}

export function LabInspector({
  mode,
  selectedComponent,
  solution,
  onUpdateParam,
  metrics,
}: LabInspectorProps) {
  const definition = selectedComponent
    ? COMPONENT_LIBRARY[selectedComponent.type]
    : null;

  return (
    <aside className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Real-vaqt ko'rsatkichlari</h3>
        <p className="text-xs text-gray-400">
          {mode === "dc" || mode === "ac" || mode === "safety"
            ? "Zanjirdagi oqim, kuchlanish va quvvat"
            : "Tanlangan laboratoriya holati"}
        </p>
      </div>

      <div className="grid gap-2">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-sm font-semibold text-white">Komponent parametrlari</h4>
        {selectedComponent && definition ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{definition.label}</span>
              <span className="uppercase tracking-wide">{selectedComponent.id}</span>
            </div>
            {definition.parameters.map((parameter) => {
              const value = selectedComponent.params[parameter.key];
              if (parameter.type === "boolean") {
                return (
                  <label key={parameter.key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{parameter.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) =>
                        onUpdateParam(selectedComponent.id, parameter.key, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-sky-500"
                    />
                  </label>
                );
              }
              return (
                <div key={parameter.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{parameter.label}</span>
                    <span>
                      {Number(value).toFixed(2)}{parameter.unit ? ` ${parameter.unit}` : ""}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={parameter.min}
                    max={parameter.max}
                    step={parameter.step}
                    value={Number(value)}
                    onChange={(event) =>
                      onUpdateParam(
                        selectedComponent.id,
                        parameter.key,
                        Number(event.target.value)
                      )
                    }
                    className="w-full accent-sky-500"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-3">
            Parametrlarni ko'rish uchun 3D maydondagi komponentni tanlang.
          </p>
        )}
      </div>

      {solution?.warnings.length ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {solution.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
