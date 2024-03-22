import CanvasState from "@/_lib/drawing";
import { Point } from "@/_lib/point";
import { TransformSettings } from "@/_lib/transform-settings";

export interface Tool {
  draw(state: CanvasState): void;
  /* Handle what happens when someone clicks the screen.
     point is in unitOfMeasure coordinates */
  handlePoint(
		point: Point,
		transformSettings: TransformSettings,
		setTransformSettings: Dispatch<SetStateAction<TransformSettings>>,
		): void;
}
