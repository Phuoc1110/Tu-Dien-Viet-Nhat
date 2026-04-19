import React from "react";
import { Volume2 } from "lucide-react";

const pickVoice = (voices, lang) => {
	if (!Array.isArray(voices) || !voices.length) {
		return null;
	}
	const lowerLang = String(lang || "ja-JP").toLowerCase();
	return (
		voices.find((voice) => String(voice.lang || "").toLowerCase() === lowerLang) ||
		voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith(lowerLang.slice(0, 2))) ||
		null
	);
};

const SpeakButton = ({
	text,
	lang = "ja-JP",
	title = "Đọc",
	iconSize = 16,
	className = "",
	rate = 0.9,
	pitch = 1,
	preventPropagation = false,
}) => {
	const value = String(text || "").trim();

	const handleSpeak = (event) => {
		if (preventPropagation) {
			event.stopPropagation();
		}
		if (!value || typeof window === "undefined" || !window.speechSynthesis) {
			return;
		}

		const utterance = new SpeechSynthesisUtterance(value);
		utterance.lang = lang;
		utterance.rate = rate;
		utterance.pitch = pitch;

		const voices = window.speechSynthesis.getVoices();
		const voice = pickVoice(voices, lang);
		if (voice) {
			utterance.voice = voice;
		}

		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(utterance);
	};

	return (
		<button
			type="button"
			title={title}
			onClick={handleSpeak}
			disabled={!value}
			className={className}
		>
			<Volume2 size={iconSize} />
		</button>
	);
};

export default SpeakButton;
