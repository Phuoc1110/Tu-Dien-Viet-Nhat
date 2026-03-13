import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import "./ImageViewer.css";

const ImageViewer = ({ isOpen, onClose, images, initialIndex = 0 }) => {
	const [currentIndex, setCurrentIndex] = useState(initialIndex);
	const [zoom, setZoom] = useState(1);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

	useEffect(() => {
		if (isOpen) {
			setCurrentIndex(initialIndex);
			setZoom(1);
			setPosition({ x: 0, y: 0 });
		}
	}, [isOpen, initialIndex]);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (!isOpen) return;
			
			switch (e.key) {
				case "Escape":
					onClose();
					break;
				case "ArrowLeft":
					goToPrevious();
					break;
				case "ArrowRight":
					goToNext();
					break;
				case "+":
				case "=":
					zoomIn();
					break;
				case "-":
					zoomOut();
					break;
				case "r":
				case "R":
					resetZoom();
					break;
				default:
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, currentIndex, images.length]);

	const goToPrevious = () => {
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
		resetZoom();
	};

	const goToNext = () => {
		setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
		resetZoom();
	};

	const zoomIn = () => {
		setZoom((prev) => Math.min(prev * 1.2, 5));
	};

	const zoomOut = () => {
		setZoom((prev) => Math.max(prev / 1.2, 0.1));
	};

	const resetZoom = () => {
		setZoom(1);
		setPosition({ x: 0, y: 0 });
	};

	const handleMouseDown = (e) => {
		if (zoom > 1) {
			setIsDragging(true);
			setLastMousePos({ x: e.clientX, y: e.clientY });
			e.preventDefault();
		}
	};

	const handleMouseMove = (e) => {
		if (isDragging && zoom > 1) {
			const deltaX = e.clientX - lastMousePos.x;
			const deltaY = e.clientY - lastMousePos.y;
			
			setPosition((prev) => ({
				x: prev.x + deltaX,
				y: prev.y + deltaY
			}));
			
			setLastMousePos({ x: e.clientX, y: e.clientY });
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleWheel = (e) => {
		e.preventDefault();
		if (e.deltaY < 0) {
			zoomIn();
		} else {
			zoomOut();
		}
	};

	if (!isOpen || !images || images.length === 0) return null;

	return (
		<div className="image-viewer-overlay" onClick={onClose}>
			<div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="image-viewer-header">
					<div className="image-counter">
						{currentIndex + 1} / {images.length}
					</div>
					<div className="image-viewer-controls">
						<button className="viewer-btn" onClick={zoomOut} title="Zoom Out (-)">
							<ZoomOut size={20} />
						</button>
						<button className="viewer-btn" onClick={zoomIn} title="Zoom In (+)">
							<ZoomIn size={20} />
						</button>
						<button className="viewer-btn" onClick={resetZoom} title="Reset (R)">
							<RotateCcw size={20} />
						</button>
						<button className="viewer-btn close-btn" onClick={onClose} title="Close (Esc)">
							<X size={24} />
						</button>
					</div>
				</div>

				{/* Image Container */}
				<div className="image-viewer-content">
					{images.length > 1 && (
						<button 
							className="nav-btn nav-btn-left" 
							onClick={goToPrevious}
							title="Previous (←)"
						>
							<ChevronLeft size={32} />
						</button>
					)}

					<div 
						className="image-wrapper"
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={handleMouseUp}
						onMouseLeave={handleMouseUp}
						onWheel={handleWheel}
						style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
					>
						<img
							src={images[currentIndex]}
							alt={`Image ${currentIndex + 1}`}
							className="viewer-image"
							style={{
								transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
								userSelect: 'none',
								pointerEvents: 'none'
							}}
							draggable={false}
						/>
					</div>

					{images.length > 1 && (
						<button 
							className="nav-btn nav-btn-right" 
							onClick={goToNext}
							title="Next (→)"
						>
							<ChevronRight size={32} />
						</button>
					)}
				</div>

				{/* Thumbnails */}
				{images.length > 1 && (
					<div className="image-thumbnails">
						{images.map((image, index) => (
							<div
								key={index}
								className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
								onClick={() => {
									setCurrentIndex(index);
									resetZoom();
								}}
							>
								<img src={image} alt={`Thumbnail ${index + 1}`} />
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default ImageViewer;
