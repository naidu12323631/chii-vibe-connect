import { Label } from "@/components/ui/label";
import { categoryByKey, categoryOf } from "@/lib/planMeta";
import ParticipantsField from "./ParticipantsField";
import VibePicker from "./VibePicker";
import type { Draft, DraftErrors } from "./planDraft";

/**
 * Step 3 is the same headcount and vibe controls as Details, with room to
 * explain what they do — Details keeps them for the fast path.
 */
const StepPreferences = ({
  draft,
  errors,
  patch,
}: {
  draft: Draft;
  errors: DraftErrors;
  patch: (changes: Partial<Draft>) => void;
}) => {
  // With no explicit vibe, milo infers one from the title and description.
  const inferred = categoryOf({ title: draft.title, description: draft.description });
  const chosen = draft.vibe ? categoryByKey(draft.vibe) : null;

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-[15px] font-bold">How many people?</Label>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          You're included, so a group of 4 means you plus three others.
        </p>
        <div className="mt-3">
          <ParticipantsField
            value={draft.maxParticipants}
            onChange={(maxParticipants) => patch({ maxParticipants })}
          />
        </div>
        {errors.maxParticipants && (
          <p className="mt-1.5 text-xs text-destructive">{errors.maxParticipants}</p>
        )}
      </div>

      <div>
        <Label className="text-[15px] font-bold">
          What's this plan about? <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Sets the tag and colour people see, and where your plan shows up on Explore.
        </p>
        <div className="mt-3">
          <VibePicker value={draft.vibe} onChange={(vibe) => patch({ vibe })} limit={8} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {chosen ? (
            <>
              <chosen.icon className={`h-4 w-4 ${chosen.iconClass}`} />
              Tagged as <span className="font-semibold text-foreground">{chosen.label}</span>
            </>
          ) : (
            <>
              <inferred.icon className={`h-4 w-4 ${inferred.iconClass}`} />
              We'll guess <span className="font-semibold text-foreground">{inferred.label}</span> from your title
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default StepPreferences;
