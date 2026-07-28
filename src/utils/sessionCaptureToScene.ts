/**
 * Capture the live session (incl. melody layers) into a scene slot.
 */
import { useSceneStore } from "../store/sceneStore";

export function captureSessionToScene(slot = 0): void {
  useSceneStore.getState().captureScene(slot);
}
