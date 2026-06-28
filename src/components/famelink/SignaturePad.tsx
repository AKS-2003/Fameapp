"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface SignaturePadProps {
	onSign: (dataUrl: string) => void;
	onCancel: () => void;
	label?: string;
}

export function SignaturePad({
	onSign,
	onCancel,
	label = "Sign here",
}: SignaturePadProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [hasDrawn, setHasDrawn] = useState(false);

	const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		if ("touches" in e) {
			return {
				x: (e.touches[0].clientX - rect.left) * scaleX,
				y: (e.touches[0].clientY - rect.top) * scaleY,
			};
		}
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		};
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.strokeStyle = "hsl(240, 30%, 12%)";
		ctx.lineWidth = 2.5;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
	}, []);

	const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx) return;
		const pos = getPos(e);
		ctx.beginPath();
		ctx.moveTo(pos.x, pos.y);
		setIsDrawing(true);
	};

	const draw = (e: React.MouseEvent | React.TouchEvent) => {
		if (!isDrawing) return;
		e.preventDefault();
		const ctx = canvasRef.current?.getContext("2d");
		if (!ctx) return;
		const pos = getPos(e);
		ctx.lineTo(pos.x, pos.y);
		ctx.stroke();
		setHasDrawn(true);
	};

	const endDraw = () => setIsDrawing(false);

	const clear = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		setHasDrawn(false);
	};

	const confirm = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		onSign(canvas.toDataURL("image/png"));
	};

	return (
		<div className="space-y-3">
			<p className="text-sm font-semibold text-white">{label}</p>
			<div className="rounded-xl border-2 border-dashed border-purple-500/20 bg-white/5 overflow-hidden">
				<canvas
					ref={canvasRef}
					width={600}
					height={200}
					className="w-full h-[120px] cursor-crosshair touch-none bg-white/90"
					onMouseDown={startDraw}
					onMouseMove={draw}
					onMouseUp={endDraw}
					onMouseLeave={endDraw}
					onTouchStart={startDraw}
					onTouchMove={draw}
					onTouchEnd={endDraw}
				/>
			</div>
			<p className="text-[11px] text-purple-200/40 text-center">
				Draw your signature above using your finger or mouse
			</p>
			<div className="flex gap-2 justify-end">
				<Button
					variant="ghost"
					size="sm"
					onClick={clear}
					className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl gap-1.5"
				>
					<Eraser className="w-3.5 h-3.5" /> Clear
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={onCancel}
					className="text-purple-300/60 hover:text-white hover:bg-white/5 rounded-xl"
				>
					Cancel
				</Button>
				<Button
					size="sm"
					className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl gap-1.5 text-white border-0"
					disabled={!hasDrawn}
					onClick={confirm}
				>
					<Check className="w-3.5 h-3.5" /> Confirm Signature
				</Button>
			</div>
		</div>
	);
}
