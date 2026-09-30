import { StatCard, type StatTone } from "../../../_components/stat-card";
import { formatTileChange, formatTileValue } from "../_lib/format-tile";
import type { CustomerReportTile } from "../types";

const TONE_CYCLE: StatTone[] = ["navy", "crimson", "orange"];

export function CustomerReportTiles({ tiles }: { tiles: CustomerReportTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile, index) => {
        const hint = formatTileChange(tile.change, tile.change_percent);
        return (
          <StatCard
            key={tile.key}
            label={tile.label}
            value={formatTileValue(tile.value, tile.format)}
            hint={hint ?? "No change data for this period"}
            tone={TONE_CYCLE[index % TONE_CYCLE.length]}
          />
        );
      })}
    </div>
  );
}
