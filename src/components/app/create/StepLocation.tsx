import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { CheckCircle2, ExternalLink, Link2, Loader2, MapPin, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { geocode } from "@/hooks/useGeocode";
import type { LatLng } from "@/lib/geo";
import { cn } from "@/lib/utils";
import WhereField from "./WhereField";
import type { Draft, DraftErrors } from "./planDraft";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "milo-pin-icon",
  html: `<span class="milo-pin-stem" style="background:#7c3aed"></span><span class="milo-pin-dot" style="background:#7c3aed"></span>`,
  iconSize: [12, 30],
  iconAnchor: [6, 30],
});

const Recentre = ({ position }: { position: LatLng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], 15);
    const timer = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(timer);
  }, [map, position]);
  return null;
};

/**
 * Step 2 confirms the place: it geocodes whatever was typed and shows the pin,
 * so the host can see where their plan will land on the map before posting.
 */
const StepLocation = ({
  draft,
  errors,
  patch,
}: {
  draft: Draft;
  errors: DraftErrors;
  patch: (changes: Partial<Draft>) => void;
}) => {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<"idle" | "looking" | "found" | "missing">("idle");
  const place = draft.location.trim();

  useEffect(() => {
    if (!place) {
      setStatus("idle");
      setCoords(null);
      return;
    }
    let active = true;
    setStatus("looking");
    geocode(place).then((result) => {
      if (!active) return;
      setCoords(result);
      setStatus(result ? "found" : "missing");
    });
    return () => { active = false; };
  }, [place]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-bold">Where are you meeting?</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          We'll pin this on the map so people nearby can find your plan.
        </p>
        <div className="mt-3">
          <WhereField
            value={draft.location}
            invalid={!!errors.location}
            onChange={(location) => patch({ location })}
          />
        </div>
        {errors.location && <p className="mt-1.5 text-xs text-destructive">{errors.location}</p>}
      </div>

      {/* ------------------------------------------------------- map preview */}
      <div className="overflow-hidden rounded-2xl border border-border bg-muted">
        {status === "found" && coords ? (
          <MapContainer
            center={[coords.lat, coords.lng]}
            zoom={15}
            scrollWheelZoom={false}
            zoomControl={false}
            className="h-52 w-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              maxZoom={19}
            />
            <Marker position={[coords.lat, coords.lng]} icon={pinIcon} />
            <Recentre position={coords} />
          </MapContainer>
        ) : (
          <div className="flex h-52 flex-col items-center justify-center gap-2 px-6 text-center">
            {status === "looking" ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Finding “{place}”…</p>
              </>
            ) : status === "missing" ? (
              <>
                <SearchX className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium">Couldn't place “{place}”</p>
                <p className="text-xs text-muted-foreground">
                  Your plan still posts fine — it just won't get a map pin. Try adding the city, or paste a Google Maps link below.
                </p>
              </>
            ) : (
              <>
                <MapPin className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Choose a place to see it on the map.</p>
              </>
            )}
          </div>
        )}
      </div>

      {status === "found" && (
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Pinned on the map
        </p>
      )}

      {/* --------------------------------------------------------- maps link */}
      <div>
        <Label htmlFor="plan-maps-2" className="text-[15px] font-bold">
          Google Maps link <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <div className="relative mt-2">
          <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="plan-maps-2"
            type="url"
            inputMode="url"
            value={draft.mapsUrl}
            onChange={(e) => patch({ mapsUrl: e.target.value })}
            placeholder="https://maps.app.goo.gl/..."
            aria-invalid={!!errors.mapsUrl}
            className={cn("h-14 rounded-2xl pl-11 text-[15px]", errors.mapsUrl && "border-destructive")}
          />
        </div>
        {errors.mapsUrl ? (
          <p className="mt-1 text-xs text-destructive">{errors.mapsUrl}</p>
        ) : (
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Pinpoints the exact venue when the place name isn't enough.
          </p>
        )}
        {draft.mapsUrl.trim() && (
          <a
            href={draft.mapsUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> Test this link
          </a>
        )}
      </div>
    </div>
  );
};

export default StepLocation;
