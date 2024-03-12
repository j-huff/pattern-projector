import useProgArrowKeyHandler from "@/_hooks/useProgArrowKeyHandler";
import { applyOffset, Point } from "@/_lib/point";
import { translate, transformPoints} from "@/_lib/geometry";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Matrix } from "ml-matrix";

export default function useProgArrowKeyPerspectivePoints(
  points: Point[],
  setPoints: Dispatch<SetStateAction<Point[]>>,
  pointToModify: number | null,
  width: number,
  height: number, 
  perspective: Matrix,
  ptDensity: number,
  active: boolean,
) {
  function perspectiveOffset(vector: Point):  Point {
    if (pointToModify === null) {
      return { x: 0, y: 0}
    }
    const pretransformedPoints = [
      { x: 0, y: 0},
      { x: width*ptDensity, y: 0},
      { x: width*ptDensity, y: height*ptDensity},
      { x: 0, y: height*ptDensity}
    ];

    /* Dots per unit. Amount of arrow spaces it takes to move 1 unit (either inch or cm) */
    const dpu = 40;
    const perspectiveScalingFactor = Math.min((height/18), (width/24))*ptDensity/dpu;
    
    const start_point = pretransformedPoints[pointToModify];
    const end_point = {x:start_point.x+(vector.x*perspectiveScalingFactor), y: start_point.y+(vector.y*perspectiveScalingFactor)}

    const transformed = transformPoints([start_point, end_point], perspective)

    const [t_start_point, t_end_point] = transformed;
    const res = {x:t_end_point.x-t_start_point.x, y:t_end_point.y-t_start_point.y}
    return res
  }

  function getNewOffset(key: string, px: number) {
    if (pointToModify !== null) {
      const newPoints = [...points];
      let newPoint: Point = points[pointToModify];
      switch (key) {
        case "ArrowUp":
          newPoint = applyOffset(points[pointToModify], perspectiveOffset({ y: -px, x: 0 }));
          break;
        case "ArrowDown":
          newPoint = applyOffset(points[pointToModify], perspectiveOffset({ y: px, x: 0 }));
          break;
        case "ArrowLeft":
          newPoint = applyOffset(points[pointToModify], perspectiveOffset({ y: 0, x: -px }));
          break;
        case "ArrowRight":
          newPoint = applyOffset(points[pointToModify], perspectiveOffset({ y: 0, x: px }));
          break;
        default:
          break;
      }
      newPoints[pointToModify] = newPoint;
      setPoints(newPoints);
    }
  }

  useProgArrowKeyHandler(
    getNewOffset,
    pointToModify !== null && active,
    [1, 3, 5, 10],
  );

  return null;
}
