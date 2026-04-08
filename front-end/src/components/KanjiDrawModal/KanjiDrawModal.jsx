import React, { useEffect, useRef, useState } from "react";
import { recognizeKanjiInk } from "../../services/dictionaryService";
import "./KanjiDrawModal.css";

const CANVAS_SIZE = 280;

const KanjiDrawModal = ({ open, onClose, onPick }) => {
	const canvasRef = useRef(null);
	const ctxRef = useRef(null);
	const drawingRef = useRef(false);
	const lastPointRef = useRef({ x: 0, y: 0 });
	const currentStrokeRef = useRef([]);
	const strokesRef = useRef([]);
	const [pickedChar, setPickedChar] = useState("");
	const [recognizing, setRecognizing] = useState(false);
	const [recognizeError, setRecognizeError] = useState("");
	const [candidates, setCandidates] = useState([]);

	useEffect(() => {
		if (!open || !canvasRef.current) {
			return;
		}

		const canvas = canvasRef.current;
		const ratio = window.devicePixelRatio || 1;
		canvas.width = CANVAS_SIZE * ratio;
		canvas.height = CANVAS_SIZE * ratio;
		canvas.style.width = `${CANVAS_SIZE}px`;
		canvas.style.height = `${CANVAS_SIZE}px`;

		const ctx = canvas.getContext("2d");
		ctx.scale(ratio, ratio);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.lineWidth = 6;
		ctx.strokeStyle = "#0f172a";
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
		ctxRef.current = ctx;
		strokesRef.current = [];
		currentStrokeRef.current = [];
		setPickedChar("");
		setRecognizeError("");
		setCandidates([]);
	}, [open]);

	if (!open) {
		return null;
	}

	const getPoint = (event) => {
		const rect = canvasRef.current.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
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
	};

	const clearCanvas = () => {
		if (!ctxRef.current) {
			return;
		}
		ctxRef.current.fillStyle = "#ffffff";
		ctxRef.current.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
		strokesRef.current = [];
		currentStrokeRef.current = [];
		setPickedChar("");
		setRecognizeError("");
		setCandidates([]);
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
			setRecognizeError("Ban chua ve net nao.");
			return null;
		}

		setRecognizeError("");
		setRecognizing(true);
		const res = await recognizeKanjiInk({
			ink,
			width: CANVAS_SIZE,
			height: CANVAS_SIZE,
			numResults: 8,
		});
		setRecognizing(false);

		if (!res || res.errCode !== 0 || !Array.isArray(res.candidates) || !res.candidates.length) {
			setCandidates([]);
			setRecognizeError("Khong nhan dien duoc, thu ve ro hon.");
			return null;
		}

		setCandidates(res.candidates);
		setPickedChar(res.candidates[0]);
		return res.candidates[0];
	};

	const applyPickedChar = async () => {
		let normalized = pickedChar.trim();
		if (!normalized) {
			normalized = (await recognizeFromDrawing()) || "";
		}
		if (!normalized) {
			return;
		}
		onPick?.(normalized);
		onClose?.();
	};

	return (
		<div className="kanji-draw-overlay" onClick={onClose}>
			<div className="kanji-draw-modal" onClick={(event) => event.stopPropagation()}>
				<div className="kanji-draw-head">
					<h3>Vẽ chữ Kanji</h3>
					<button type="button" onClick={onClose}>
						Dong
					</button>
				</div>

				<p className="kanji-draw-hint">
					Ve net kanji, bam Nhan dien va he thong se tu dong tim kiem chu vua ve.
				</p>

				<canvas
					ref={canvasRef}
					className="kanji-draw-canvas"
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerLeave={handlePointerUp}
				/>

				<div className="kanji-draw-actions">
					<button type="button" onClick={clearCanvas}>
						Xoa net
					</button>
					<button type="button" onClick={recognizeFromDrawing} disabled={recognizing}>
						{recognizing ? "Dang nhan dien..." : "Nhan dien"}
					</button>
				</div>

				{recognizeError && <p className="kanji-draw-error">{recognizeError}</p>}

				{candidates.length > 0 && (
					<div className="kanji-draw-candidates">
						{candidates.slice(0, 8).map((item, idx) => (
							<button key={`${item}-${idx}`} type="button" onClick={() => setPickedChar(item)}>
								{item}
							</button>
						))}
					</div>
				)}

				<div className="kanji-draw-pick-row">
					<input
						type="text"
						maxLength={2}
						value={pickedChar}
						onChange={(event) => setPickedChar(event.target.value)}
						placeholder="Nhap chu kanji"
					/>
					<button type="button" onClick={applyPickedChar}>
						Tim kanji nay
					</button>
				</div>
			</div>
		</div>
	);
};

export default KanjiDrawModal;
