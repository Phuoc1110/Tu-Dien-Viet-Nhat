// Polyfills for browser build so libraries expecting Node globals (like simple-peer deps) work
import process from "process";
// Expose process globally if not present
if (typeof window !== "undefined" && !window.process) {
	window.process = process;
}

// If additional polyfills needed later (Buffer, etc.), add here.
