"use client";

interface StagePositionPreviewProps {
	startPosition: string;
	endPosition: string;
	className?: string;
}

export function StagePositionPreview({
	startPosition,
	endPosition,
	className = "",
}: StagePositionPreviewProps) {
	const positions = {
		"upstage-left": { x: 10, y: 10 },
		upstage: { x: 50, y: 10 },
		"upstage-right": { x: 90, y: 10 },
		left: { x: 10, y: 50 },
		center: { x: 50, y: 50 },
		right: { x: 90, y: 50 },
		"downstage-left": { x: 10, y: 90 },
		downstage: { x: 50, y: 90 },
		"downstage-right": { x: 90, y: 90 },
	};

	const getPosition = (position: string) => {
		return (
			positions[position as keyof typeof positions] || { x: 50, y: 50 }
		);
	};

	const startPos = getPosition(startPosition);
	const endPos = getPosition(endPosition);

	return (
		<div className={`bg-muted/50 rounded-lg p-4 ${className}`}>
			<h4 className="text-sm font-medium mb-3">Stage Position Preview</h4>
			<div className="relative w-full h-32 bg-background border-2 border-dashed border-muted-foreground/30 rounded">
				{/* Stage Labels */}
				<div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
					Upstage (Back)
				</div>
				<div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
					Downstage (Front)
				</div>
				<div className="absolute left-1 top-1/2 transform -translate-y-1/2 rotate-90 text-xs text-muted-foreground">
					Left
				</div>
				<div className="absolute right-1 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">
					Right
				</div>

				{/* Start Position */}
				{startPosition && (
					<div
						className="absolute w-3 h-3 bg-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg"
						style={{
							left: `${startPos.x}%`,
							top: `${startPos.y}%`,
						}}
						title="Start Position"
					/>
				)}

				{/* End Position */}
				{endPosition && endPosition !== startPosition && (
					<div
						className="absolute w-3 h-3 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg"
						style={{
							left: `${endPos.x}%`,
							top: `${endPos.y}%`,
						}}
						title="End Position"
					/>
				)}

				{/* Movement Line */}
				{startPosition &&
					endPosition &&
					startPosition !== endPosition && (
						<svg className="absolute inset-0 w-full h-full pointer-events-none">
							<line
								x1={`${startPos.x}%`}
								y1={`${startPos.y}%`}
								x2={`${endPos.x}%`}
								y2={`${endPos.y}%`}
								stroke="currentColor"
								strokeWidth="2"
								strokeDasharray="4 4"
								className="text-muted-foreground"
							/>
							<polygon
								points={`${endPos.x - 1},${endPos.y - 2} ${
									endPos.x + 1
								},${endPos.y - 2} ${endPos.x},${endPos.y + 1}`}
								fill="currentColor"
								className="text-muted-foreground"
							/>
						</svg>
					)}
			</div>

			{/* Audience Label */}
			<div className="text-center mt-2">
				<span className="text-sm font-bold tracking-[0.3em] uppercase text-muted-foreground">
					AUDIENCE
				</span>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-4 mt-3 text-xs">
				{startPosition && (
					<div className="flex items-center gap-1">
						<div className="w-2 h-2 bg-green-500 rounded-full"></div>
						<span>Start</span>
					</div>
				)}
				{endPosition && endPosition !== startPosition && (
					<div className="flex items-center gap-1">
						<div className="w-2 h-2 bg-red-500 rounded-full"></div>
						<span>End</span>
					</div>
				)}
			</div>
		</div>
	);
}
