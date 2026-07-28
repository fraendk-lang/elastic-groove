/**
 * Permanent kit load: drums-only — clear L3/pad ghost patterns and silence melody buses.
 * Hover preview uses stopMelodyPlayback() only (patterns stay intact).
 */
import { clearL3PadPattern } from "../components/PerformancePad/clearPadMelodyLayer";
import { stopMelodyPlayback } from "./stopMelodyPlayback";

export function prepareDrumsOnlyKitLoad(): void {
  clearL3PadPattern(true);
  stopMelodyPlayback();
}
