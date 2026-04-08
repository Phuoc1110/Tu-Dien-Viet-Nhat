import React, { useEffect, useRef, useState } from "react";
import { recognizeKanjiInk } from "../../services/dictionaryService";
import "./KanjiDrawModal.css";

const KanjiDrawModal = ({ open, onClose, onPick, anchorRef }) => {
	const canvasRef = useRef(null);
	const ctxRef = useRef(null);
	const canvasSizeRef = useRef({ width: 280, height: 280 });
	const drawingRef = useRef(false);
	const lastPointRef = useRef({ x: 0, y: 0 });
	const currentStrokeRef = useRef([]);
	const strokesRef = useRef([]);
	const recognizeTimerRef = useRef(null);
	const recognizeRequestIdRef = useRef(0);
	const [recognizing, setRecognizing] = useState(false);
	const [recognizeError, setRecognizeError] = useState("");
	const [candidates, setCandidates] = useState([]);
	const [panelStyle, setPanelStyle] = useState(null);

	useEffect(() => {
		if (!open || !canvasRef.current) {
			return;
		}

		const anchorWidth = anchorRef?.current?.getBoundingClientRect?.()?.width || 640;
		const displayWidth = Math.max(280, Math.min(Math.floor(anchorWidth - 36), 1120));
		const displayHeight = Math.max(220, Math.min(Math.floor(displayWidth * 0.34), 330));
		canvasSizeRef.current = { width: displayWidth, height: displayHeight };

		const canvas = canvasRef.current;
		const ratio = window.devicePixelRatio || 1;
		canvas.width = displayWidth * ratio;
		canvas.height = displayHeight * ratio;
		canvas.style.width = `${displayWidth}px`;
		canvas.style.height = `${displayHeight}px`;

		const ctx = canvas.getContext("2d");
		ctx.scale(ratio, ratio);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.lineWidth = 6;
		ctx.strokeStyle = "#0f172a";
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, displayWidth, displayHeight);
		ctxRef.current = ctx;
		strokesRef.current = [];
		currentStrokeRef.current = [];
		setRecognizeError("");
		setCandidates([]);
		if (recognizeTimerRef.current) {
			clearTimeout(recognizeTimerRef.current);
			recognizeTimerRef.current = null;
		}
	}, [open, anchorRef]);

	useEffect(() => {
		return () => {
			if (recognizeTimerRef.current) {
				clearTimeout(recognizeTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!open) {
			setPanelStyle(null);
			return;
		}

		const syncPosition = () => {
			const anchorEl = anchorRef?.current;
			if (!anchorEl) {
				setPanelStyle(null);
				return;
			}

			const rect = anchorEl.getBoundingClientRect();
			const maxWidth = Math.min(rect.width, window.innerWidth - 24);
			const left = Math.max(12, Math.min(rect.left, window.innerWidth - maxWidth - 12));

			setPanelStyle({
				left,
				top: rect.bottom + 8,
				width: maxWidth,
			});
		};

		syncPosition();
		window.addEventListener("resize", syncPosition);
		window.addEventListener("scroll", syncPosition, true);

		return () => {
			window.removeEventListener("resize", syncPosition);
			window.removeEventListener("scroll", syncPosition, true);
		};
	}, [open, anchorRef]);

	if (!open) {
		return null;
	}

	const getPoint = (event) => {
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const scaleX = rect.width ? canvasSizeRef.current.width / rect.width : 1;
		const scaleY = rect.height ? canvasSizeRef.current.height / rect.height : 1;
		return {
			x: (event.clientX - rect.left) * scaleX,
			y: (event.clientY - rect.top) * scaleY,
		};
	};

	const handlePointerDown = (event) => {
		if (!ctxRef.current) {
			return;
		}
		event.preventDefault();
		const point = getPoint(event);
		drawingRef.current = true;
		lastPointRef.current = point;
		currentStrokeRef.current = [point];
	};

	const handlePointerMove = (event) => {
		if (!drawingRef.current || !ctxRef.current) {
			return;
		}
		event.preventDefault();
		const point = getPoint(event);
		const ctx = ctxRef.current;
		ctx.beginPath();
		ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
		ctx.lineTo(point.x, point.y);
		ctx.stroke();
		lastPointRef.current = point;
		currentStrokeRef.current.push(point);
	};

	const handlePointerUp = () => {
		if (currentStrokeRef.current.length > 1) {
			strokesRef.current.push([...currentStrokeRef.current]);
		}
		currentStrokeRef.current = [];
		drawingRef.current = false;

		if (recognizeTimerRef.current) {
			clearTimeout(recognizeTimerRef.current);
		}
		recognizeTimerRef.current = setTimeout(() => {
			recognizeFromDrawing();
		}, 180);
	};

	const clearCanvas = () => {
		if (!ctxRef.current) {
			return;
		}
		const { width, height } = canvasSizeRef.current;
		ctxRef.current.fillStyle = "#ffffff";
		ctxRef.current.fillRect(0, 0, width, height);
		strokesRef.current = [];
		currentStrokeRef.current = [];
		setRecognizeError("");
		setCandidates([]);
		if (recognizeTimerRef.current) {
			clearTimeout(recognizeTimerRef.current);
			recognizeTimerRef.current = null;
		}
	};

	const buildInkPayload = () => {
		return strokesRef.current
			.filter((stroke) => Array.isArray(stroke) && stroke.length > 1)
			.map((stroke) => {
				const xs = stroke.map((point) => Math.round(point.x));
				const ys = stroke.map((point) => Math.round(point.y));
				const ts = stroke.map((_, index) => index);
				return [xs, ys, ts];
			});
	};

	const recognizeFromDrawing = async () => {
		const ink = buildInkPayload();
		if (!ink.length) {
			setRecognizeError("");
			return null;
		}

		const requestId = recognizeRequestIdRef.current + 1;
		recognizeRequestIdRef.current = requestId;

		setRecognizeError("");
		setRecognizing(true);
		const res = await recognizeKanjiInk({
			ink,
			width: canvasSizeRef.current.width,
			height: canvasSizeRef.current.height,
			numResults: 8,
		});

		if (requestId !== recognizeRequestIdRef.current) {
			return null;
		}

		setRecognizing(false);

		if (!res || res.errCode !== 0 || !Array.isArray(res.candidates) || !res.candidates.length) {
			setCandidates([]);
			setRecognizeError("Khong nhan dien duoc, thu ve ro hon.");
			return null;
		}

		setCandidates(res.candidates);
		return res.candidates[0];
	};

	const applyPickedChar = (value) => {
		const normalized = String(value || "").trim();
		if (!normalized) {
			return;
		}
		onPick?.(normalized);
	};

	return (
		<div className="kanji-draw-overlay" onClick={onClose}>
			<div
				className={`kanji-draw-modal ${panelStyle ? "kanji-draw-docked" : ""}`}
				onClick={(event) => event.stopPropagation()}
				style={panelStyle || undefined}
			>
				<div className="kanji-draw-head">
					<h3>Vẽ chữ Kanji</h3>
					<button type="button" onClick={onClose}>
						Dong
					</button>
				</div>

				<p className="kanji-draw-hint">Hệ thống tự nhận diện sau mỗi nét vẽ.</p>

				<div className="kanji-draw-board-wrap">
					<canvas
						ref={canvasRef}
						className="kanji-draw-canvas"
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
						onPointerLeave={handlePointerUp}
					/>
				</div>

				<div className="kanji-draw-actions">
					<button type="button" onClick={clearCanvas}>
						Xoa net
					</button>
				</div>

				{recognizing && <p className="kanji-draw-working">Dang nhan dien...</p>}

				{recognizeError && <p className="kanji-draw-error">{recognizeError}</p>}

				{candidates.length > 0 && (
					<div className="kanji-draw-candidates">
						{candidates.slice(0, 8).map((item, idx) => (
							<button
								key={`${item}-${idx}`}
								type="button"
								onClick={() => applyPickedChar(item)}
							>
								{item}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default KanjiDrawModal;
