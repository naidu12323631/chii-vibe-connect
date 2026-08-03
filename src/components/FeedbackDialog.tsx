import { MessageSquareHeart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FeedbackForm from "@/components/FeedbackForm";

const FeedbackDialog = ({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5 text-primary" />
            How's chillout going?
          </DialogTitle>
          <DialogDescription>
            Tell us how your experience has been — it only takes a second.
          </DialogDescription>
        </DialogHeader>
        <FeedbackForm
          onSubmitted={() => {
            onSubmitted?.();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
