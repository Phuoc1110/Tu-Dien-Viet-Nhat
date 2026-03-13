let ws;
export const connectWebSocket = (setSlotStatus) => {
	if (!ws || ws.readyState === WebSocket.CLOSED) {
		ws = new WebSocket("ws://192.168.1.14:81");

		ws.onopen = () => {
			console.log("WebSocket kết nối thành công!");
		};

		ws.onmessage = (event) => {
			if (setSlotStatus) {
				setSlotStatus(event.data);
			}
		};

		ws.onclose = () => {
			setTimeout(() => connectWebSocket(setSlotStatus), 5000);
		};
	}
};

export const closeWebSocket = () => {
	if (ws) {
		ws.close();
	}
};
