import { Link } from "react-router-dom";
import { loadErrorMessage } from "@/lib/loadError";

interface LoadErrorProps {
  error: unknown;
  backTo: string;
  backLabel: string;
}

// Shown in place of a page whose record could not be loaded, so nothing that looks like the record is displayed.
export default function LoadError({ error, backTo, backLabel }: LoadErrorProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
        {loadErrorMessage(error)}
      </div>
      <Link to={backTo} className="text-sm text-primary hover:underline">
        {backLabel}
      </Link>
    </div>
  );
}
