"use client";

import { useState } from "react";

type RegionOption = {
  id: string;
  displayTitle: string;
};

export function RegionJumpSelect({ regions }: { regions: readonly RegionOption[] }) {
  const [selectedRegion, setSelectedRegion] = useState("");

  const moveToRegion = (regionId: string) => {
    setSelectedRegion(regionId);
    if (!regionId) return;

    const target = document.getElementById(regionId);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${regionId}`);
  };

  return (
    <div className="region-jump">
      <label htmlFor="region-jump-select">Ir a una región</label>
      <select id="region-jump-select" value={selectedRegion} onChange={(event) => moveToRegion(event.target.value)}>
        <option value="">Selecciona una región</option>
        {regions.map((region) => <option key={region.id} value={region.id}>{region.displayTitle}</option>)}
      </select>
    </div>
  );
}
