import OpenAI from "openai";

import { beverages, dishes, initialPrompt, SpeakAgainAbortError, speechRecognitionErrorToMessage, tools } from "./consts";
import { recognize, speak } from "./speech";
import { createTableRow, gatherReceiptItems, printToTable } from "./utils";
import "./index.css";

import type { Beverage, Dish, Item } from "./consts";

const divCustomer = document.getElementById("customer") as HTMLDivElement;
const divWaiter = document.getElementById("waiter") as HTMLDivElement;
const divMessage = document.getElementById("message") as HTMLDivElement;
const divReceipt = document.getElementById("receipt") as HTMLDivElement;
const tableItems = document.getElementById("items") as HTMLTableElement;
const mainContainer = document.getElementById("main-container") as HTMLDivElement;
const micButton = document.getElementById("mic-button") as HTMLButtonElement;
const keyInput = document.getElementById("key-input") as HTMLInputElement;
const keyInputForm = document.getElementById("key-input-form") as HTMLFormElement;
const formContainer = document.getElementById("form-container") as HTMLFormElement;
const resultContainer = document.getElementById("result-container") as HTMLFormElement;
const backButton = document.getElementById("back-button") as HTMLButtonElement;
const backContent = document.getElementById("back-content") as HTMLDivElement;
const imgMenu = document.getElementById("menu") as HTMLImageElement;
const menuLinks = document.getElementsByClassName("menu-link");
const restartButtons = document.getElementsByClassName("restart-button");
const speakAgainButton = document.getElementById("speak-again-button") as HTMLButtonElement;

let menuWindow: Window | null;
for (const menuLink of menuLinks)
	menuLink.addEventListener("click", event => {
		if (menuWindow && !menuWindow.closed) {
			menuWindow.focus();
			event.preventDefault();
			return;
		}
		menuWindow = open(imgMenu.src, "menuWindow", `width=${imgMenu.naturalWidth},height=${imgMenu.naturalHeight}`);
		if (menuWindow) {
			function menuLoaded() {
				menuWindow!.document.documentElement.style.height = "100%";
				Object.assign(menuWindow!.document.body.style, { height: "100%", backgroundColor: "white" });
			}
			menuWindow.addEventListener("DOMContentLoaded", menuLoaded);
			menuWindow.addEventListener("load", menuLoaded);
			event.preventDefault();
		}
	});

let apiKey = new URLSearchParams(location.search).get("apiKey") || "";
if (apiKey) keyInput.value = apiKey;
keyInput.addEventListener("input", () => {
	apiKey = keyInput.value;
	const queries = { apiKey };
	history.replaceState(queries, document.title, location.pathname + (apiKey && `?${new URLSearchParams(queries)}`));
});

let openai: OpenAI;

mainContainer.style.display = "none";
resultContainer.style.display = "none";

let messages: ReturnType<typeof initialPrompt>;

let customer = "";
let waiter = "";

divWaiter.textContent = waiter;

async function startConversation(signal: AbortSignal) {
	if (!apiKey) return;
	openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
	formContainer.style.display = "none";
	mainContainer.style.display = "";
	resultContainer.style.display = "none";
	messages = initialPrompt();
	divCustomer.textContent = "";
	divWaiter.style.color = "";
	divWaiter.style.backgroundColor = "";
	divWaiter.textContent = waiter = "你好，要乜嘢？";
	micButton.disabled = true;
	speakAgainButton.disabled = true;
	await speak(waiter, signal);
	while (true) {
		micButton.disabled = false;
		while (true) {
			const speakAgainController = new AbortController();
			const { signal: speakAgainSignal } = speakAgainController;
			const restartOrSpeakAgainSignal = AbortSignal.any([signal, speakAgainSignal]);
			if (resultContainer.style.display) {
				speakAgainButton.addEventListener("click", () => customer && speakAgainController.abort(new SpeakAgainAbortError()), { signal });
				divCustomer.style.color = "darkgrey";
				divCustomer.textContent = "請講嘢……";
				customer = "";
				try {
					for await (customer of recognize(micButton, restartOrSpeakAgainSignal)) {
						divCustomer.style.color = "";
						divCustomer.textContent = customer;
						speakAgainButton.disabled = false;
					}
					if (customer) break;
				} catch (error) {
					if (!(error instanceof SpeakAgainAbortError)) throw error;
				}
			}
			speakAgainButton.disabled = true;
			divCustomer.style.color = "darkgrey";
			divCustomer.textContent = "撳一下個咪開始講嘢";
			await new Promise((resolve, reject) => {
				micButton.addEventListener("click", resolve, { once: true });
				restartOrSpeakAgainSignal.addEventListener(
					"abort",
					() => {
						micButton.removeEventListener("click", resolve);
						reject(signal.reason);
					},
					{ once: true }
				);
			});
		}
		messages.push({ role: "user", content: customer });
		divWaiter.style.color = "gainsboro";
		divWaiter.textContent = "諗緊……";
		micButton.disabled = true;
		speakAgainButton.disabled = true;
		let response = await askForResponse(signal);
		while (true) {
			const toolCalls = response?.tool_calls;
			if (!toolCalls?.length) break;
			for (const { id, function: toolCall } of toolCalls) {
				if (((name): name is keyof typeof methods => name in methods)(toolCall.name))
					messages.push({
						role: "tool",
						["name" as never]: toolCall.name,
						content: JSON.stringify(methods[toolCall.name](toolCall.arguments), undefined, 2),
						tool_call_id: id,
					});
			}
			response = await askForResponse(signal);
			if (response?.content) {
				mainContainer.style.display = "none";
				resultContainer.style.display = "";
				break;
			}
		}
	}
}

async function askForResponse(signal: AbortSignal) {
	const response = await openai.chat.completions.create(
		{
			model: "gpt-4o-mini-2024-07-18",
			max_tokens: 512,
			temperature: 0.2,
			messages,
			tools,
			parallel_tool_calls: false,
		},
		{ signal }
	);
	const message = response.choices[0]?.message;
	if (message) {
		messages.push(message);
		if (message.content) {
			divWaiter.style.color = "";
			divWaiter.textContent = waiter = message.content;
			await speak(waiter, signal);
		}
	}
	return message;
}

async function startAbortableConversation(event?: SubmitEvent) {
	event?.preventDefault();
	const controller = new AbortController();
	const { signal } = controller;
	for (const restartButton of restartButtons)
		restartButton.addEventListener(
			"click",
			() => {
				controller.abort(new OpenAI.APIUserAbortError());
				if (mainContainer.contains(restartButton)) {
					restartButton.classList.remove("rotate");
					(restartButton as HTMLButtonElement).offsetWidth; // Trigger DOM reflow
					restartButton.classList.add("rotate");
				}
				startAbortableConversation();
			},
			{ signal }
		);
	try {
		await startConversation(signal);
	} catch (error: any) {
		if (error instanceof OpenAI.APIUserAbortError) return;
		controller.abort(new OpenAI.APIUserAbortError());
		divWaiter.style.color = "";
		divWaiter.style.backgroundColor = "red";
		divWaiter.textContent =
			(error instanceof SpeechRecognitionErrorEvent
				? speechRecognitionErrorToMessage[error.error]
				: `${error.name || ""}${error.name && error.message ? ": " : ""}${error.message || ""}`) || "發生未知錯誤";
		micButton.disabled = true;
		speakAgainButton.disabled = true;
		const restartController = new AbortController();
		const { signal: restartSignal } = restartController;
		for (const restartButton of restartButtons)
			restartButton.addEventListener(
				"click",
				() => {
					restartController.abort();
					startAbortableConversation();
				},
				{ signal: restartSignal }
			);
	}
}

keyInputForm.addEventListener("submit", startAbortableConversation);

backButton.addEventListener("click", () => {
	mainContainer.style.display = "";
	resultContainer.style.display = "none";
});

const formatPrice = new Intl.NumberFormat("zh-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format;
const formatTime = new Intl.DateTimeFormat("zh-HK", { dateStyle: "short", timeStyle: "short", hour12: false }).format;

const methods = {
	notify_staff() {
		divReceipt.style.display = "none";
		divMessage.style.display = "";
		backContent.textContent = "撳返回繼續同侍應對話";
		return { success: true };
	},
	place_order(response: string) {
		let order: { order: Item[] };
		try {
			order = JSON.parse(response);
		} catch ({ message }: any) {
			return {
				success: false,
				reason: "JSON parse error",
				message,
			};
		}
		// The response is guaranteed to match the schema, thus validation is not needed:
		// https://platform.openai.com/docs/guides/structured-outputs
		const foods: Dish[] = [];
		const drinks: (Beverage & { cold: boolean })[] = [];
		const invalidIds: string[] = [];
		for (const { id, beverage_type, quantity } of order.order) {
			if (id in dishes) foods.push(...Array.from({ length: quantity }, () => ({ ...dishes[id]! })));
			else if (id in beverages) drinks.push(...Array.from({ length: quantity }, () => ({ ...beverages[id]!, cold: beverage_type === "cold" })));
			else invalidIds.push(id);
		}
		if (invalidIds.length) {
			return {
				success: false,
				reason: "Invalid item ids: " + invalidIds.join(", "),
			};
		}
		const receipt = foods.map(({ name, price }) => ({ name, price }));
		let i = foods.length;
		for (const { name, cold } of drinks) {
			receipt.push({ name: name + (cold ? " (凍)" : " (熱)"), price: +(--i < 0) * 18 + +cold * 3 });
		}
		if (receipt.length) {
			const subtotal = receipt.reduce((prev, { price }) => prev + price, 0);
			const caption = document.createElement("caption");
			caption.textContent = `單號：123456\n時間：${formatTime(new Date())}`;
			printToTable(tableItems, caption, ["項目", "數量", "金額"], gatherReceiptItems(receipt), ["name", "amount", "price"], { price: formatPrice });

			const tableBodyBottom = document.createElement("tbody");
			tableBodyBottom.appendChild(createTableRow("小計", formatPrice(subtotal)));
			tableBodyBottom.appendChild(createTableRow("服務費", formatPrice(subtotal * 0.1)));
			tableItems.appendChild(tableBodyBottom);

			const tableFoot = document.createElement("tfoot");
			tableFoot.appendChild(createTableRow("總計", formatPrice(subtotal * 1.1)));
			tableFoot.appendChild(createTableRow("", ""));
			tableItems.appendChild(tableFoot);

			divReceipt.style.display = "";
			divMessage.style.display = "none";
			backContent.textContent = "如收據有誤，請撳返回並叫侍應更正。";
			return { success: true };
		}
		return {
			success: false,
			reason: "No valid items",
		};
	},
};
