"use client";

import React from "react";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
	}

	resetError = () => {
		this.setState({ hasError: false, error: undefined });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				const FallbackComponent = this.props.fallback;
				return (
					<FallbackComponent
						error={this.state.error}
						resetError={this.resetError}
					/>
				);
			}

			return (
				<div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 text-white flex items-center justify-center p-4">
					<div className="text-center max-w-md">
						<h2 className="text-2xl font-bold mb-4">
							Something went wrong
						</h2>
						<p className="text-purple-200 mb-6">
							We encountered an error while loading this page.
							Please try refreshing or go back to the home page.
						</p>
						<div className="space-y-4">
							<button
								onClick={this.resetError}
								className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
							>
								Try Again
							</button>
							<button
								onClick={() => (window.location.href = "/")}
								className="bg-transparent border border-purple-400 text-purple-300 hover:bg-purple-600 hover:text-white px-6 py-2 rounded-lg font-medium transition-colors ml-4"
							>
								Go Home
							</button>
						</div>
						{process.env.NODE_ENV === "development" &&
							this.state.error && (
								<details className="mt-6 text-left">
									<summary className="cursor-pointer text-sm text-purple-300">
										Error Details (Development)
									</summary>
									<pre className="mt-2 text-xs bg-purple-900/50 p-4 rounded overflow-auto">
										{this.state.error.stack}
									</pre>
								</details>
							)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
