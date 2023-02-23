import { ChatGPTAPI, ChatMessage } from "chatgpt/build";
import { prompt, dishes, beverages, Dish, Beverage, printToTable } from "./utils";
import "./index.css";

const apiKey = new URLSearchParams(location.search).get("apiKey");

if (!apiKey) {
	document.getElementById("customer")!.style.display = "none";
	document.getElementById("waiter")!.style.display = "none";
	document.getElementById("receipt")!.style.display = "none";
	document.getElementById("message")!.textContent = "Missing API Key; append `?apiKey=…` to URL";
	throw new Error("Missing API Key; append `?apiKey=…` to URL");
}

const recognition = new webkitSpeechRecognition();
recognition.lang = "zh-HK";
recognition.interimResults = true;

const api = new ChatGPTAPI({
	apiKey,
	userLabel: "客人",
	assistantLabel: "侍應",
	completionParams: {
		max_tokens: 512,
		temperature: 0.2,
	},
});

// { style: "currency", currency: "HKD", currencyDisplay: "narrowSymbol" }
const formatPrice = new Intl.NumberFormat("zh-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format;
const formatTime = new Intl.DateTimeFormat("zh-HK", { dateStyle: "short", timeStyle: "short", hour12: false }).format;

type State = "customerPreparing" | "customerThinking" | "customerSpeaking" | "waiterPreparing" | "waiterThinking" | "waiterSpeaking";

let response = {} as ChatMessage;

let customer = "";
let waiter = "你好，要嗌咩？";
let state: State;

const divCustomer = document.getElementById("customer") as HTMLDivElement;
const divWaiter = document.getElementById("waiter") as HTMLDivElement;
const divMessage = document.getElementById("message") as HTMLDivElement;
const divReceipt = document.getElementById("receipt") as HTMLDivElement;

divMessage.style.display = "none";
divReceipt.style.display = "none";

function handleRecognitionResult(event: SpeechRecognitionEvent) {
	const result = event.results[0];
	const text = result?.[0]?.transcript;
	if (text) customer = text;
	setState(result?.isFinal ? (text ? "waiterPreparing" : "customerPreparing") : "customerSpeaking");
}

function setState(newState: State) {
	if (newState !== state) {
		switch ((state = newState)) {
			case "customerPreparing":
				recognition.addEventListener("result", handleRecognitionResult);
				recognition.start();
				setState("customerThinking");
				break;
			case "waiterPreparing":
				recognition.removeEventListener("result", handleRecognitionResult);
				api
					.sendMessage(customer, {
						promptPrefix: prompt,
						onProgress: res => {
							waiter = res.text;
							setState("waiterSpeaking");
						},
						conversationId: response.conversationId,
						parentMessageId: response.id,
					})
					.then(res => {
						response = res;
						waiter = res.text;
						if (parseResponse(waiter)) setState("customerPreparing");
						else {
							divCustomer.style.display = "none";
							divWaiter.style.display = "none";
						}
					});
				setState("waiterThinking");
				break;
		}
		divCustomer.style.color = state === "customerPreparing" || state === "customerThinking" ? "darkgrey" : "";
		divWaiter.style.color = state === "waiterPreparing" || state === "waiterThinking" ? "gainsboro" : "";
	}
	divCustomer.textContent = state === "customerPreparing" || state === "customerThinking" ? "請講嘢……" : customer;
	divWaiter.textContent = state === "waiterPreparing" || state === "waiterThinking" ? "諗緊……" : waiter;
}

setState("customerPreparing");

function parseResponse(text: string) {
	if (text.includes("NOTIFY_STAFF")) {
		divMessage.style.display = "";
		divMessage.textContent = "已通知職員";
		return false;
	}
	const index = text.indexOf("PLACE_ORDER");
	if (index !== -1) {
		const ids = text
			.slice(index + 11)
			.split(" ")
			.reduce((arr, item) => {
				if (item) {
					if (item === "H" || item === "C") arr[arr.length - 1] += item;
					else arr.push(item);
				}
				return arr;
			}, [] as string[]);
		const foods: Dish[] = [];
		const drinks: (Beverage & { cold: boolean })[] = [];
		for (let id of ids) {
			if (id in dishes) foods.push({ ...dishes[id]! });
			else {
				const final = id.slice(-1);
				let cold = false;
				if (final === "C") {
					cold = true;
					id = id.slice(0, -1);
				} else if (final === "H") id = id.slice(0, -1);
				if (id in beverages) drinks.push({ ...beverages[id]!, cold });
			}
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
			const tableItems = printToTable(["項目", "數量", "金額"], gatherReceiptItems(receipt), ["name", "amount", "price"], { price: formatPrice });
			tableItems.id = "items";
			tableItems.insertBefore(caption, tableItems.firstElementChild);

			const tableBodyBottom = document.createElement("tbody");
			tableBodyBottom.appendChild(createTableRow("小計", formatPrice(subtotal)));
			tableBodyBottom.appendChild(createTableRow("服務費", formatPrice(subtotal * 0.1)));
			tableItems.appendChild(tableBodyBottom);

			const tableFoot = document.createElement("tfoot");
			tableFoot.appendChild(createTableRow("總計", formatPrice(subtotal * 1.1)));
			tableFoot.appendChild(createTableRow("", ""));
			tableItems.appendChild(tableFoot);

			divReceipt.style.display = "";
			divReceipt.appendChild(tableItems);
			return false;
		}
	}
	return true;
}

function createTableRow(head: string, value: string) {
	const tableRow = document.createElement("tr");
	const tableHeaderCell = document.createElement("th");
	tableHeaderCell.textContent = head;
	tableRow.appendChild(tableHeaderCell);
	tableRow.appendChild(document.createElement("td"));
	const tableDataCell = document.createElement("td");
	tableDataCell.textContent = value;
	tableRow.appendChild(tableDataCell);
	return tableRow;
}

// By ChatGPT

type ReceiptItem = {
	name: string;
	price: number;
};

type GatheredReceiptItem = {
	name: string;
	amount: number;
	price: number;
};

function gatherReceiptItems(receipt: ReceiptItem[]): GatheredReceiptItem[] {
	const gatheredItemsMap = new Map<string, GatheredReceiptItem>();

	receipt.forEach(({ name, price }) => {
		const existingItem = gatheredItemsMap.get(name);
		if (existingItem) {
			existingItem.amount++;
			existingItem.price += price;
		} else gatheredItemsMap.set(name, { name, amount: 1, price });
	});

	return Array.from(gatheredItemsMap.values());
}
