import { Point } from "@/_lib/point";
import Tool from "@/_lib/canvas/tool";
import {
  rotateMatrixDeg,
	mirrorMatrix2Points,
	extractTranslationMatrix,
	translate,
} from "@/_lib/geometry";

export class DrawLineTool implements Tool {
  private startPoint: Point | null = null;
  private endPoint: Point | null = null;

  public draw(cs: CanvasState): void {
		const ctx = cs.ctx;
    
    if (!this.startPoint || !this.endPoint) {
      return;
    }
    
    ctx.beginPath();
    ctx.moveTo(this.startPoint.x, this.startPoint.y);
    ctx.lineTo(this.endPoint.x, this.endPoint.y);
    ctx.stroke();
  }

	/* Point is in unit coordinates */
  public handlePoint(
		point: Point,
		transformSettings: TransformSettings,
		setTransformSettings: Dispatch<SetStateAction<TransformSettings>>,
	): void {
    if (!this.startPoint) {
      this.startPoint = point;
			setTransformSettings({...transformSettings})
			return;
    } else if (!this.endPoint) {
			this.endPoint = point;
			setTransformSettings({...transformSettings})
			return;
		}
		console.log("start point ", this.startPoint)
		console.log("end point ", this.endPoint)
		const vec = {
			x: this.endPoint.x - this.startPoint.x,
			y: this.endPoint.y - this.startPoint.y,
		} 
		
		const m = translate(vec);
		const newTransformMatrix = m.mmul(transformSettings.matrix);
		/* Both points set */
//		setTransformSettings({
//			...transformSettings,
//			matrix: newTransformMatrix,
//		})
		console.log("old matrix ", JSON.stringify(transformSettings.matrix));
		const newMatrix = mirrorMatrix2Points(transformSettings.matrix, this.startPoint, this.endPoint);
		console.log("new matrix", JSON.stringify(newMatrix));
		console.log("new translation matrix", JSON.stringify(extractTranslationMatrix(newMatrix)));

		setTransformSettings({
			...transformSettings,
			matrix: newMatrix,
		})

		this.reset()
  }

  public reset(): void {
    this.startPoint = null;
    this.endPoint = null;
  }
}
