import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { Clock, ExternalLink, Users } from "lucide-react";
import type { Participant, Plan } from "@/hooks/usePlans";
import { categoryOf, formatWhen, mapsLinkFor } from "@/lib/planMeta";
import type { LatLng } from "@/lib/geo";
import { centroid } from "@/lib/geo";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

/** Plans sharing one geocoded location, drawn as a single pin or cluster bubble. */
export type Spot = {
  key: string;
  location: string;
  position: LatLng;
  plans: Plan[];
};

/** A coloured dot with a short stem, so the card appears to hang above the point. */
const pinIcon = (color: string) =>
  L.divIcon({
    className: "milo-pin-icon",
    html: `<span class="milo-pin-stem" style="background:${color}"></span><span class="milo-pin-dot" style="background:${color}"></span>`,
    iconSize: [12, 30],
    iconAnchor: [6, 30],
  });

/** The "N plans" bubble used where several plans share a place. */
const clusterIcon = (count: number, active: boolean) =>
  L.divIcon({
    className: "milo-pin-icon",
    html:
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;` +
      `height:56px;width:56px;border-radius:9999px;background:${active ? "#7c3aed" : "rgba(255,255,255,0.95)"};` +
      `color:${active ? "#ffffff" : "#7c3aed"};box-shadow:0 4px 14px rgba(76,29,149,.25);font-weight:800;line-height:1.05;">` +
      `<span style="font-size:16px">${count}</span><span style="font-size:10px;font-weight:600;opacity:.85">plans</span></div>`,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });

/** Frames the map on the given points, and re-measures after layout changes. */
const MapFrame = ({ points, focus }: { points: LatLng[]; focus: LatLng | null }) => {
  const map = useMap();

  useEffect(() => {
    // The container is sized by CSS, so Leaflet needs a nudge once it's laid out.
    const timer = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), {
        padding: [70, 70],
        maxZoom: 15,
      });
    }
    // Only reframe when the set of points changes, not on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus, points.map((p) => `${p.lat},${p.lng}`).join("|")]);

  return null;
};

/**
 * Faces of the people on a plan, drawn right on the map. Tapping any face opens
 * that plan's detail page — same as tapping the card itself.
 */
const PeopleOnPin = ({
  host,
  participants,
  onOpen,
}: {
  host: Participant["profile"];
  participants: Participant[];
  onOpen: () => void;
}) => {
  // The host leads, then whoever joined, de-duplicated.
  const faces = [
    ...(host ? [host] : []),
    ...participants.map((p) => p.profile).filter((p): p is NonNullable<typeof p> => !!p && p.id !== host?.id),
  ].slice(0, 4);
  if (faces.length === 0) return null;

  return (
    <div className="mt-1.5 flex -space-x-1.5">
      {faces.map((person) => (
        <button
          key={person.id}
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          title={person.display_name ?? "Someone going"}
          aria-label={`Open plan · ${person.display_name ?? "someone going"}`}
          className="h-6 w-6 overflow-hidden rounded-full bg-primary/20 ring-2 ring-white transition-transform hover:scale-110"
        >
          {person.avatar_url ? (
            <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-primary">
              {(person.display_name ?? "U")[0]?.toUpperCase()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

const PlanCardPin = ({ plan, onOpen }: { plan: Plan; onOpen: (plan: Plan) => void }) => {
  const category = categoryOf(plan);
  const mapsHref = mapsLinkFor(plan);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(plan)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(plan); }}
      className={cn(
        "w-[168px] cursor-pointer rounded-2xl border p-2.5 shadow-lg transition-transform hover:scale-[1.02]",
        category.palette.card,
      )}
    >
      <div className="flex items-center gap-1.5">
        <category.icon className={cn("h-4 w-4 shrink-0", category.palette.text)} />
        <span className="truncate text-[13px] font-bold text-foreground">{plan.title}</span>
      </div>
      {plan.location && (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{plan.location}</p>
      )}
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Users className="h-3 w-3" /> {plan.participants.length}/{plan.max_participants} going
      </p>
      {plan.plan_time && (
        <span
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-semibold",
            category.palette.text,
          )}
        >
          <Clock className="h-3 w-3" /> {formatWhen(plan.plan_time)}
        </span>
      )}

      <PeopleOnPin host={plan.profile ?? null} participants={plan.participants} onOpen={() => onOpen(plan)} />

      {mapsHref && (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          Google Maps <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
};

/**
 * OpenStreetMap-backed plan map. Single-plan places get a floating card; places
 * with several plans get a "N plans" bubble that selects them on tap.
 */
const PlanMap = ({
  spots,
  userPosition,
  focus,
  selectedKey,
  onSelectSpot,
  onOpenPlan,
  maxCards = 6,
}: {
  spots: Spot[];
  userPosition: LatLng | null;
  focus: LatLng | null;
  selectedKey: string | null;
  onSelectSpot: (key: string | null) => void;
  onOpenPlan: (plan: Plan) => void;
  maxCards?: number;
}) => {
  const points = useMemo(() => {
    const all = spots.map((s) => s.position);
    return userPosition ? [...all, userPosition] : all;
  }, [spots, userPosition]);

  const fallbackCentre = centroid(spots.map((s) => s.position)) ??
    userPosition ?? { lat: 12.9716, lng: 77.5946 }; // Bangalore, matching the design

  // Cards are capped so permanent tooltips don't pile up; the rest stay as dots.
  const cardKeys = useMemo(() => {
    const singles = spots.filter((s) => s.plans.length === 1);
    const ranked = [...singles].sort((a, b) => b.plans[0].participants.length - a.plans[0].participants.length);
    const keys = new Set(ranked.slice(0, maxCards).map((s) => s.key));
    if (selectedKey) keys.add(selectedKey);
    return keys;
  }, [spots, maxCards, selectedKey]);

  return (
    <MapContainer
      center={[fallbackCentre.lat, fallbackCentre.lng]}
      zoom={13}
      scrollWheelZoom={false}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <MapFrame points={points} focus={focus} />

      {/* ------------------------------------------------------- you are here */}
      {userPosition && (
        <>
          <Circle
            center={[userPosition.lat, userPosition.lng]}
            radius={320}
            pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.12, weight: 0 }}
          />
          <CircleMarker
            center={[userPosition.lat, userPosition.lng]}
            radius={8}
            pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}
          />
        </>
      )}

      {/* -------------------------------------------------------------- plans */}
      {spots.map((spot) => {
        const many = spot.plans.length > 1;
        const category = categoryOf(spot.plans[0]);
        const active = spot.key === selectedKey;

        if (many) {
          return (
            <Marker
              key={spot.key}
              position={[spot.position.lat, spot.position.lng]}
              icon={clusterIcon(spot.plans.length, active)}
              eventHandlers={{ click: () => onSelectSpot(active ? null : spot.key) }}
            />
          );
        }

        return (
          <Marker
            key={spot.key}
            position={[spot.position.lat, spot.position.lng]}
            icon={pinIcon(category.palette.dot)}
            eventHandlers={{ click: () => onSelectSpot(active ? null : spot.key) }}
          >
            {cardKeys.has(spot.key) && (
              <Tooltip
                permanent
                interactive
                direction="top"
                offset={[0, -30]}
                className="milo-plan-tip"
              >
                <PlanCardPin plan={spot.plans[0]} onOpen={onOpenPlan} />
              </Tooltip>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default PlanMap;
