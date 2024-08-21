import OpenAI from "openai";
import { dishes, beverages, Dish, Beverage, initialPrompt, functions, validate } from "./consts";
import { recognize, speak } from "./speech";
import { printToTable, createTableRow, gatherReceiptItems } from "./utils";
import "./index.css";

const divCustomer = document.getElementById("customer") as HTMLDivElement;
const divWaiter = document.getElementById("waiter") as HTMLDivElement;
const divMessage = document.getElementById("message") as HTMLDivElement;
const divReceipt = document.getElementById("receipt") as HTMLDivElement;
const tableItems = document.getElementById("items") as HTMLTableElement;
const mainContainer = document.getElementById("main-container") as HTMLDivElement;
const micButton = document.getElementById("mic-button") as HTMLDivElement;
const keyInput = document.getElementById("key-input") as HTMLInputElement;
const keyInputForm = document.getElementById("key-input-form") as HTMLFormElement;
const formContainer = document.getElementById("form-container") as HTMLFormElement;
const resultContainer = document.getElementById("result-container") as HTMLFormElement;
const backButton = document.getElementById("back-button") as HTMLDivElement;
const backContent = document.getElementById("back-content") as HTMLDivElement;
const imgMenu = document.getElementById("menu") as HTMLImageElement;
const menuLinks = document.getElementsByClassName("menu-link");
const restartButtons = document.getElementsByClassName("restart-button");

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
	await speak(waiter, signal);
	while (true) {
		while (true) {
			if (resultContainer.style.display) {
				divCustomer.style.color = "darkgrey";
				divCustomer.textContent = "請講嘢……";
				customer = "";
				for await (customer of recognize(micButton, signal)) {
					divCustomer.style.color = "";
					divCustomer.textContent = customer;
				}
				if (customer) break;
			}
			divCustomer.style.color = "darkgrey";
			divCustomer.textContent = "撳一下個咪開始講嘢";
			await new Promise((resolve, reject) => {
				micButton.addEventListener("click", resolve, { once: true });
				signal.addEventListener(
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
		let response = await askForResponse(signal);
		while (true) {
			const functionCall = response?.function_call;
			if (!functionCall || !((name): name is keyof typeof methods => name in methods)(functionCall.name)) break;
			const result = methods[functionCall.name](functionCall.arguments);
			messages.push({
				role: "function",
				name: functionCall.name,
				content: JSON.stringify(result, undefined, 2),
			});
			response = await askForResponse(signal);
			if (response?.content && result.success) {
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
			model: "gpt-4",
			max_tokens: 512,
			temperature: 0.2,
			messages,
			functions,
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
					(restartButton as HTMLDivElement).offsetWidth; // Trigger DOM reflow
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
		divWaiter.textContent = error.message;
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
		let order: any;
		try {
			order = JSON.parse(response);
		} catch ({ message }: any) {
			return {
				success: false,
				reason: "JSON parse error",
				message,
			};
		}
		if (!validate(order)) {
			return {
				success: false,
				reason: "JSON validate errors",
				errors: validate.errors,
			};
		}
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
