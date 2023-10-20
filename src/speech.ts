let recognition: SpeechRecognition;
if (typeof webkitSpeechRecognition === "undefined") {
	document.getElementById("not-supported")!.textContent = "你嘅瀏覽器唔支援語音辨識服務，無法使用本程式。請使用其他瀏覽器。";
	(document.getElementById("form-submit") as HTMLInputElement).disabled = true;
} else {
	recognition = new webkitSpeechRecognition();
	recognition.interimResults = true;
}

export function recognize(button: HTMLElement, signal: AbortSignal) {
	return {
		[Symbol.asyncIterator]() {
			let resolve: (result: IteratorResult<string, undefined>) => void;
			let reject: (reason?: any) => void;
			function setResolvers(_resolve: typeof resolve, _reject: typeof reject) {
				resolve = _resolve;
				reject = _reject;
			}
			let promise = new Promise<IteratorResult<string, undefined>>(setResolvers);
			function handleRecognitionResult(event: SpeechRecognitionEvent) {
				const result = event.results[0];
				const value = result?.[0]?.transcript;
				if (value) {
					resolve({ value, done: false });
					promise = new Promise(setResolvers);
					if (result.isFinal) endRecognition();
				}
			}
			function endRecognition() {
				recognition.stop();
				recognition.removeEventListener("result", handleRecognitionResult);
				recognition.removeEventListener("end", endRecognition);
				recognition.removeEventListener("error", onError);
				button.removeEventListener("click", endRecognition);
				button.classList.remove("enabled");
				resolve({ value: undefined, done: true });
			}
			function onError(event: SpeechRecognitionErrorEvent) {
				reject(event);
				endRecognition();
			}
			recognition.addEventListener("result", handleRecognitionResult);
			recognition.addEventListener("end", endRecognition);
			recognition.addEventListener("error", onError);
			button.addEventListener("click", endRecognition);
			button.classList.add("enabled");
			recognition.start();
			signal.addEventListener(
				"abort",
				() => {
					reject(signal.reason);
					endRecognition();
				},
				{ once: true }
			);
			return { next: () => promise };
		},
	};
}

let utteranceVoice: SpeechSynthesisVoice | null;
if (typeof speechSynthesis === "undefined") {
	document.getElementById("not-supported")!.textContent = "你嘅瀏覽器唔支援語音合成服務，無法使用本程式。請使用其他瀏覽器。";
	(document.getElementById("form-submit") as HTMLInputElement).disabled = true;
} else {
	setLanguage();
	speechSynthesis.addEventListener("voiceschanged", setLanguage);
}

function setLanguage() {
	const voices = speechSynthesis
		.getVoices()
		.reverse()
		.map(voice => {
			const { language, script, region } = new Intl.Locale(voice.lang);
			return { voice, score: (+(language === "yue") << 2) | (+(script === "Hant") << 1) | +(region === "HK") };
		})
		.sort((left, right) => right.score - left.score);
	recognition.lang = voices[0]?.score ? voices[0].voice.lang : "zh-yue-Hant-HK";
	utteranceVoice = (voices[0]?.score && voices.find(({ voice }) => voice.localService)?.voice) || null;
}

export async function speak(text: string, signal: AbortSignal) {
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.voice = utteranceVoice;
	utterance.rate = 1.1;
	speechSynthesis.speak(utterance);
	await new Promise((resolve, reject) => {
		utterance.addEventListener("end", resolve, { once: true });
		signal.addEventListener(
			"abort",
			() => {
				speechSynthesis.cancel();
				utterance.removeEventListener("end", resolve);
				reject(signal.reason);
			},
			{ once: true }
		);
	});
}
