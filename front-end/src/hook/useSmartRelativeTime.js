import { useEffect, useState } from "react";

export default function useSmartRelativeTime(date, formatFn) {
	const isValid = date && typeof formatFn === "function";
	const [display, setDisplay] = useState(() => (isValid ? formatFn(date) : ""));

	useEffect(() => {
		if (!isValid) return;

		function update() {
			setDisplay(formatFn(date));
		}

		const parsedDate = new Date(date);
		const diff = Date.now() - parsedDate.getTime();
		if (isNaN(diff)) return;

		let interval = null;
		if (diff < 60 * 1000) interval = 1000;
		else if (diff < 60 * 60 * 1000) interval = 60 * 1000;
		else if (diff < 24 * 60 * 60 * 1000) interval = 60 * 60 * 1000;

		if (interval) {
			const id = setInterval(update, interval);
			return () => clearInterval(id);
		}
	}, [date, formatFn, isValid]);

	return display;
}
