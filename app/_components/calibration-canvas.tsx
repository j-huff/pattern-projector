import Matrix from "ml-matrix";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { interp, minIndex, sqrdist, transformPoints } from "@/_lib/geometry";
import {
  applyOffset,
  mouseToCanvasPoint,
  Point,
  touchToCanvasPoint,
} from "@/_lib/point";
import { TransformSettings } from "@/_lib/transform-settings";
import { CornerColorHex } from "@/_components/theme/colors";
import useProgArrowKeyPerspectivePoints from "@/_hooks/useProgArrowKeyPerspectivePoints";

const maxPoints = 4; // One point per vertex in rectangle
const PRECISION_MOVEMENT_THRESHOLD = 15;
const PRECISION_MOVEMENT_RATIO = 5;
const PRECISION_MOVEMENT_DELAY = 500;

function getStrokeStyle(pointToModify: number) {
  return [
    CornerColorHex.TOPLEFT,
    CornerColorHex.TOPRIGHT,
    CornerColorHex.BOTTOMRIGHT,
    CornerColorHex.BOTTOMLEFT,
  ][pointToModify % 4];
}

function draw(
  ctx: CanvasRenderingContext2D,
  offset: Point,
  points: Point[],
  width: number,
  height: number,
  perspective: Matrix,
  isCalibrating: boolean,
  pointToModify: number | null,
  ptDensity: number,
  isPrecisionMovement: boolean,
  displayAllCorners?: boolean,
): void {
  ctx.translate(offset.x, offset.y);

  ctx.fillStyle = "#000";

  drawPolygon(ctx, points);
  if (isCalibrating) {
    ctx.fill();
  } else {
    drawBorder(ctx);
  }

  ctx.strokeStyle = "#000";
  ctx.beginPath();
  if (isCalibrating) {
    ctx.strokeStyle = "#fff";
    drawGrid(ctx, width, height, perspective, 0, ptDensity);

    const perspectiveScalingFactor = Math.min((height/18), (width/24))*ptDensity;
    console.log(ptDensity)
    const pretransformedPoints = [
      { x: 0, y: 0},
      { x: width*ptDensity, y: 0},
      { x: width*ptDensity, y: height*ptDensity},
      { x: 0, y: height*ptDensity}
    ];
    if (displayAllCorners) {
      pretransformedPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.strokeStyle = getStrokeStyle(index);
        if (index !== pointToModify) {
          drawCircle(ctx, point, 1*perspectiveScalingFactor, perspective, 36);
          ctx.lineWidth = 4;
        } else {
          if (isPrecisionMovement) {
            drawCrosshair(ctx, point, perspective, 1*perspectiveScalingFactor);
            ctx.lineWidth = 2;
          } else {
            drawCircle(ctx, point, 2*perspectiveScalingFactor, perspective, 36);
            ctx.lineWidth = 4;
          }
        }
        ctx.stroke();
      });
    } else if (pointToModify !== null) {
      const point = pretransformedPoints[pointToModify];
      if (isPrecisionMovement) {
        drawCrosshair(ctx, point, perspective, 1*perspectiveScalingFactor);
        ctx.lineWidth = 2;
      } else {
        drawCircle(ctx, point, 2*perspectiveScalingFactor, perspective, 36);
        ctx.lineWidth = 4;
      }
      ctx.strokeStyle = getStrokeStyle(pointToModify);
      ctx.stroke();
    }
  } else {
    ctx.setLineDash([1]);
    drawGrid(ctx, width, height, perspective, 8, ptDensity);
  }
}

function drawBorder(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.lineDashOffset = 0;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  perspective: Matrix,
  outset: number,
  ptDensity: number,
): void {
  const majorLine = 5;

  for (let i = 0; i <= width; i++) {
    let lineWidth = 1;
    if (i % majorLine === 0 || i === width) {
      lineWidth = 2;
    }
    const line = transformPoints(
      [
        { x: i * ptDensity, y: -outset * ptDensity },
        { x: i * ptDensity, y: (height + outset) * ptDensity },
      ],
      perspective,
    );
    drawLine(ctx, line[0], line[1], lineWidth);
  }
  for (let i = 0; i <= height; i++) {
    let lineWidth = 1;
    if (i % majorLine === 0 || i === height) {
      lineWidth = 2;
    }
    // Move origin to bottom left to match cutting mat
    const y = (height - i) * ptDensity;
    const line = transformPoints(
      [
        { x: -outset * ptDensity, y: y },
        { x: (width + outset) * ptDensity, y: y },
      ],
      perspective,
    );
    drawLine(ctx, line[0], line[1], lineWidth);
  }
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  p2: Point,
  lineWidth: number = 1,
): void {
  ctx.beginPath();
  ctx.lineWidth = lineWidth;
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function drawCrosshair(ctx: CanvasRenderingContext2D, center: Point, matrix: Matrix, size: number = 10) {
  const transformedPoints = transformPoints([
    {x: center.x + size, y: center.y},
    {x: center.x - size, y: center.y},
    {x: center.x, y: center.y + size},
    {x: center.x,  y: center.y - size}
  ], matrix)
  ctx.beginPath();
  ctx.moveTo(transformedPoints[0].x, transformedPoints[0].y);
  ctx.lineTo(transformedPoints[1].x, transformedPoints[1].y);
  ctx.moveTo(transformedPoints[2].x, transformedPoints[2].y);
  ctx.lineTo(transformedPoints[3].x, transformedPoints[3].y);
}

function drawCircle(ctx: CanvasRenderingContext2D, center: Point, radius: number, matrix: Matrix, segments: number = 36) {
  const points = Array(segments).fill(null).map((_, index) => {
    const angle = (index / segments) * 2 * Math.PI; // Angle for this segment
    return {
      x: center.x + radius * Math.cos(angle),
      y:center.y + radius * Math.sin(angle),
    };
  });

  const transformedPoints = transformPoints(points, matrix); // Apply matrix transformation to all points

  ctx.beginPath();
  transformedPoints.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath(); // Connect the last point with the first one
}

function drawPolygon(ctx: CanvasRenderingContext2D, points: Point[]): void {
  const last = points.at(-1);
  if (last === undefined) {
    return;
  }
  ctx.moveTo(last.x, last.y);
  for (let p of points) {
    ctx.lineTo(p.x, p.y);
  }
}

const CORNER_MARGIN = 150;

/**
 * A window width and height canvas used for projector calibration
 * @param draw - Draws in the canvas rendering context
 */
export default function CalibrationCanvas({
  className,
  points,
  setPoints,
  pointToModify,
  setPointToModify,
  perspective,
  width,
  height,
  isCalibrating,
  ptDensity,
  transformSettings,
  setTransformSettings,
}: {
  className: string | undefined;
  points: Point[];
  setPoints: Dispatch<SetStateAction<Point[]>>;
  pointToModify: number | null;
  setPointToModify: Dispatch<SetStateAction<number | null>>;
  perspective: Matrix;
  width: number;
  height: number;
  isCalibrating: boolean;
  ptDensity: number;
  transformSettings: TransformSettings;
  setTransformSettings: Dispatch<SetStateAction<TransformSettings>>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [cursorMode, setCursorMode] = useState<string | null>(null);
  const [isPrecisionMovement, setIsPrecisionMovement] = useState(false);
  const [dragStartTime, setDragStartTime] = useState<number | null>(null);
  const [dragStartMousePoint, setDragStartMousePoint] = useState<Point | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [precisionActivationPoint, setPrecisionActivationPoint] = useState<Point | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPrecisionMovement && pointToModify !== null && points.length > pointToModify)
    setPrecisionActivationPoint(prevPoint => points[pointToModify]);
  }, [isPrecisionMovement, pointToModify]);

  useEffect(() => {
    if (canvasRef !== null && canvasRef.current !== null) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx !== null) {
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        draw(
          ctx,
          dragOffset,
          points,
          width,
          height,
          perspective,
          isCalibrating,
          pointToModify,
          ptDensity,
          isPrecisionMovement,
          transformSettings.isFourCorners,
        );
      }
    }
  }, [
    dragOffset,
    points,
    perspective,
    width,
    height,
    isCalibrating,
    pointToModify,
    ptDensity,
    transformSettings.isFourCorners,
    isPrecisionMovement
  ]);

  function getShortestDistance(p: Point): number {
    return points
      .map((a) => Math.sqrt(sqrdist(a, p)))
      .reduce((final, a) => (!final || a < final ? a : final));
  }

  function handleDown(newPoint: Point) {
    if (points.length < maxPoints) {
      setPoints([...points, newPoint]);
    } else {
      const shortestDist: number = getShortestDistance(newPoint);
      if (shortestDist < CORNER_MARGIN) {
        const newPointToModify = minIndex(points.map((a) => sqrdist(a, newPoint)))
        setPointToModify(newPointToModify);
        setDragStartTime(Date.now());
        setDragStartMousePoint(newPoint);
        setDragStartPoint(points[newPointToModify]);

      // Set a timeout to activate precision movement after the delay
      const timeoutId = setTimeout(() => {
        if (!isPrecisionMovement)
      setIsPrecisionMovement(true);
      }, PRECISION_MOVEMENT_DELAY);

      // Store the timeout ID to clear it if needed
      setTimeoutId(timeoutId);

      } else {
        setPointToModify(null);
        setPanStart(newPoint);
      }
    }
  }

  function handleMove(p: Point, filter: number) {
    if (pointToModify !== null) {
      //Check if we should active precision movement
      if (
        !isPrecisionMovement &&
        dragStartTime !== null &&
        dragStartMousePoint !== null &&
        Date.now() - dragStartTime > PRECISION_MOVEMENT_DELAY &&
    Math.sqrt(sqrdist(dragStartMousePoint, p)) < PRECISION_MOVEMENT_THRESHOLD &&
        timeoutId != null 
      ) {
        setIsPrecisionMovement(true);
        if (pointToModify !== null)
      setPrecisionActivationPoint(points[pointToModify]);
      }

      if (
        !isPrecisionMovement &&
        dragStartTime !== null &&
        dragStartMousePoint !== null &&
    Math.sqrt(sqrdist(dragStartMousePoint, p)) > PRECISION_MOVEMENT_THRESHOLD &&
        timeoutId != null 
      ) {
        // Clear the timeout when the mouse is released
        // Setting timeoutId to null deactivates precision drag for the rest
        // of this drag sequence
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }


      const newPoints = [...points];
      let destination = {
        x: p.x,
        y: p.y
      }
      if (dragStartMousePoint !== null && dragStartPoint !== null) 
      {
        destination = {
          x: dragStartMousePoint.x + ((p.x - dragStartMousePoint.x) / (isPrecisionMovement ? PRECISION_MOVEMENT_RATIO : 1)),
          y: dragStartMousePoint.y + ((p.y - dragStartMousePoint.y) / (isPrecisionMovement ? PRECISION_MOVEMENT_RATIO : 1))
        }
        /* The following 2 lines help to prevent the calibration point from "jumping" */
        destination.x -= (dragStartMousePoint.x - dragStartPoint.x)
        destination.y -= (dragStartMousePoint.y - dragStartPoint.y)
      }
      if (precisionActivationPoint && dragStartPoint)
      {
        /* The following 2 lines help to prevent the calibration point from "jumping" */
        destination.x += (precisionActivationPoint.x - dragStartPoint.x)
        destination.y += (precisionActivationPoint.y - dragStartPoint.y)
      }

      const offset = {
        x: (destination.x - newPoints[pointToModify].x),
        y: (destination.y - newPoints[pointToModify].y),
      };
      newPoints[pointToModify] = {
        x: newPoints[pointToModify].x + offset.x,
        y: newPoints[pointToModify].y + offset.y,
      };
      setPoints(newPoints);
    } else if (panStart !== null) {
      setDragOffset({ x: p.x - panStart.x, y: p.y - panStart.y });
    }
  }

  function handleHover(p: Point) {
    const shortestDist: number = getShortestDistance(p);
    if (shortestDist < CORNER_MARGIN) {
      setCursorMode("corner");
    } else {
      setCursorMode("pan");
    }
  }

  function handleMouseUp() {
    localStorage.setItem("points", JSON.stringify(points));
    if (panStart) {
      setPoints(points.map((p) => applyOffset(p, dragOffset)));
      setDragOffset({ x: 0, y: 0 });
      setPanStart(null);
    }
    setIsPrecisionMovement(false);
    setDragStartTime(null);
    setDragStartMousePoint(null);
    setDragStartPoint(null);
    setPrecisionActivationPoint(null);

    // Clear the timeout when the mouse is released
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }

  function handleTouchUp() {
    localStorage.setItem("points", JSON.stringify(points));
    setPointToModify(null);
    setPanStart(null);
    setIsPrecisionMovement(false);
    setDragStartTime(null);
    setDragStartMousePoint(null);
    setDragStartPoint(null);
    setPrecisionActivationPoint(null);

    // Clear the timeout when the touch is released
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }

  const handleKeyDown = useCallback(
    function (e: React.KeyboardEvent) {
      if (e.code === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          setTransformSettings({
            ...transformSettings,
            isFourCorners: !transformSettings.isFourCorners,
          });
        } else {
          const newPointToModify =
            (pointToModify === null ? 0 : pointToModify + 1) % points.length;
          setPointToModify(newPointToModify);
        }
      } else if (e.code === "Escape") {
        if (pointToModify !== null) {
          if (e.target instanceof HTMLElement) {
            e.target.blur();
          }
          setPointToModify(null);
        }
      }
    },
    [
      pointToModify,
      transformSettings,
      setPointToModify,
      points.length,
      setTransformSettings,
    ],
  );

  useProgArrowKeyPerspectivePoints(points, setPoints, pointToModify, width, height, perspective, ptDensity, isCalibrating);

  return (
    <canvas
      tabIndex={0}
      ref={canvasRef}
      className={className + " outline-none"}
      onKeyDown={handleKeyDown}
      onMouseMove={(e: React.MouseEvent) => {
        if ((e.buttons & 1) == 0) {
          handleMouseUp();
          handleHover(mouseToCanvasPoint(e));
        } else {
          handleMove(mouseToCanvasPoint(e), 1);
        }
      }}
      onMouseDown={(e) => handleDown(mouseToCanvasPoint(e))}
      onMouseUp={() => handleMouseUp()}
      onTouchStart={(e: React.TouchEvent) => handleDown(touchToCanvasPoint(e))}
      onTouchMove={(e: React.TouchEvent) =>
        handleMove(touchToCanvasPoint(e), 0.05)
      }
      onTouchEnd={() => handleTouchUp()}
      style={{
        cursor:
          cursorMode === "corner"
            ? "url('/crosshair.png') 11 11, crosshair"
            : "grab",
        pointerEvents: isCalibrating ? "auto" : "none",
      }}
    />
  );
}
