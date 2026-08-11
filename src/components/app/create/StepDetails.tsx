import { Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import CoverPicker from "./CoverPicker";
import ParticipantsField from "./ParticipantsField";
import VibePicker from "./VibePicker";
import WhenField from "./WhenField";
import WhereField from "./WhereField";
import { DESCRIPTION_MAX, TITLE_MAX, type Draft, type DraftErrors } from "./planDraft";

const Required = () => <span className="text-destructive"> *</span>;

const StepDetails = ({
  draft,
  errors,
  patch,
}: {
  draft: Draft;
  errors: DraftErrors;
  patch: (changes: Partial<Draft>) => void;
}) => (
  <div className="space-y-6">
    <CoverPicker value={draft.cover} onChange={(cover) => patch({ cover })} />

    {/* -------------------------------------------------------------- title */}
    <div>
      <Label htmlFor="plan-title" className="text-[15px] font-bold">
        Title<Required />
      </Label>
      <div className="relative mt-2">
        <Input
          id="plan-title"
          value={draft.title}
          maxLength={TITLE_MAX}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Coffee & co-work ☕"
          aria-invalid={!!errors.title}
          className={cn(
            "h-14 rounded-2xl pr-16 text-[15px]",
            errors.title ? "border-destructive" : "border-border focus-visible:border-primary",
          )}
        />
        <span
          className={cn(
            "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium",
            draft.title.length >= TITLE_MAX ? "text-destructive" : "text-primary",
          )}
        >
          {draft.title.length} / {TITLE_MAX}
        </span>
      </div>
      {errors.title && <p className="mt-1.5 text-xs text-destructive">{errors.title}</p>}
    </div>

    {/* -------------------------------------------------------- description */}
    <div>
      <Label htmlFor="plan-description" className="text-[15px] font-bold">Description</Label>
      <div className="relative mt-2">
        <Textarea
          id="plan-description"
          value={draft.description}
          maxLength={DESCRIPTION_MAX}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="What are we doing? Who's invited? Any special notes?"
          className="min-h-[110px] rounded-2xl pb-8 text-[15px]"
        />
        <span className="pointer-events-none absolute bottom-3 right-4 text-[13px] text-muted-foreground">
          {draft.description.length} / {DESCRIPTION_MAX}
        </span>
      </div>
    </div>

    {/* ----------------------------------------------------------- when/where */}
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label className="text-[15px] font-bold">When<Required /></Label>
        <div className="mt-2">
          <WhenField
            date={draft.date}
            time={draft.time}
            invalid={!!errors.when}
            onChange={({ date, time }) => patch({ date, time })}
          />
        </div>
        {errors.when && <p className="mt-1.5 text-xs text-destructive">{errors.when}</p>}
      </div>
      <div>
        <Label className="text-[15px] font-bold">Where<Required /></Label>
        <div className="mt-2">
          <WhereField
            value={draft.location}
            invalid={!!errors.location}
            onChange={(location) => patch({ location })}
          />
        </div>
        {errors.location && <p className="mt-1.5 text-xs text-destructive">{errors.location}</p>}
      </div>
    </div>

    {/* ------------------------------------------------------------ maps link */}
    <div>
      <Label htmlFor="plan-maps" className="text-[15px] font-bold">
        Google Maps link <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <div className="relative mt-2">
        <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="plan-maps"
          type="url"
          inputMode="url"
          value={draft.mapsUrl}
          onChange={(e) => patch({ mapsUrl: e.target.value })}
          placeholder="https://maps.app.goo.gl/..."
          aria-invalid={!!errors.mapsUrl}
          className={cn("h-14 rounded-2xl pl-11 text-[15px]", errors.mapsUrl && "border-destructive")}
        />
      </div>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        Paste a share link from Google Maps so people can find the spot easily.
      </p>
      {errors.mapsUrl && <p className="mt-1 text-xs text-destructive">{errors.mapsUrl}</p>}
    </div>

    {/* --------------------------------------------------------- participants */}
    <div>
      <Label className="text-[15px] font-bold">Max participants</Label>
      <div className="mt-2">
        <ParticipantsField
          value={draft.maxParticipants}
          onChange={(maxParticipants) => patch({ maxParticipants })}
        />
      </div>
    </div>

    {/* ------------------------------------------------------------- the vibe */}
    <div>
      <Label className="text-[15px] font-bold">
        What's this plan about? <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <div className="mt-2">
        <VibePicker value={draft.vibe} onChange={(vibe) => patch({ vibe })} />
      </div>
    </div>
  </div>
);

export default StepDetails;
