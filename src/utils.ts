export type Dish = {
	category: "早餐" | "常餐" | "茶餐" | "特餐";
	id: string;
	name: string;
	price: number;
};
export type Beverage = {
	id: string;
	name: string;
};

const dishesArr: Dish[] = [
	{ category: "早餐", id: "B1", name: "歐式軟多士 拼 炒滑蛋", price: 32 },
	{ category: "早餐", id: "B2", name: "榨菜肉絲湯米粉", price: 32 },
	{ category: "早餐", id: "B3", name: "西煎雙蛋火腿 拼 歐式軟多士", price: 35 },
	{ category: "早餐", id: "B4", name: "炒滑蛋雙腸 拼 歐式軟多士", price: 35 },
	{ category: "早餐", id: "C", name: "忌廉雞湯火腿通粉", price: 31 },
	{ category: "早餐", id: "B5", name: "忌廉雞湯火腿通粉 拼 炒滑蛋及歐式軟多士", price: 37 },
	{ category: "早餐", id: "B6", name: "忌廉雞湯火腿通粉 拼 雙腸及歐式軌多士", price: 37 },
	{ category: "早餐", id: "D", name: "惹味五香肉丁公仔麵", price: 33 },
	{ category: "早餐", id: "B7", name: "惹味五香肉丁公仔麵 拼 炒滑蛋及歐式軟多士", price: 39 },
	{ category: "早餐", id: "B8", name: "惹味五香肉丁公仔麵 拼 火腿及歐式軟多士", price: 39 },
	{ category: "早餐", id: "B9", name: "惹味五香肉丁公仔麵 拼 雙腸及歐式軟多士", price: 39 },
	{ category: "早餐", id: "E", name: "潮式沙茶牛肉公仔麵", price: 33 },
	{ category: "早餐", id: "B10", name: "潮式沙茶牛肉公仔麵 拼 炒滑蛋及歐式軟多士", price: 39 },
	{ category: "早餐", id: "B11", name: "潮式沙茶牛肉公仔麵 拼 火腿及歐式軟多士", price: 39 },
	{ category: "早餐", id: "B12", name: "潮式沙茶牛肉公仔麵 拼 雙腸及歐式軟多士", price: 39 },
	{ category: "常餐", id: "A5", name: "叉燒湯意粉 拼 炒滑蛋雙腸及歐式軟多士", price: 61 },
	{ category: "常餐", id: "A6", name: "叉燒湯意粉 拼 炒滑蛋火腿及歐式軟多士", price: 61 },
	{ category: "常餐", id: "A7", name: "夠薑豬膶牛肉湯米粉 拼 炒滑蛋及歐式軟多士", price: 61 },
	{ category: "常餐", id: "A8", name: "夠薑豬膶牛肉湯米粉 拼 火腿及歐式軟多士", price: 61 },
	{ category: "常餐", id: "A9", name: "夠薑豬膶牛肉湯米粉 拼 雙腸及歐式軟多士", price: 61 },
	{ category: "茶餐", id: "T1", name: "馬來三叔公咖吔多士", price: 32 },
	{ category: "茶餐", id: "T4", name: "荷蘭煉奶西多士", price: 35 },
	{ category: "茶餐", id: "T5", name: "脆皮雞中翼", price: 39 },
	{ category: "茶餐", id: "T6", name: "榨菜肉絲雞翼公仔麵", price: 44 },
	{ category: "特餐", id: "S1", name: "懷舊厚切餐肉煎雙蛋飯", price: 53 },
	{ category: "特餐", id: "S2A", name: "煎蛋免治牛肉飯", price: 56 },
	{ category: "特餐", id: "S2B", name: "煎蛋免治牛肉意粉", price: 56 },
	{ category: "特餐", id: "S3", name: "香煎芙蓉蛋飯", price: 63 },
	{ category: "特餐", id: "S4", name: "蔥油豬扒煎雙蛋飯", price: 63 },
	{ category: "特餐", id: "S5", name: "超大雞扒飯", price: 63 },
	{ category: "特餐", id: "S6", name: "超級雜扒飯", price: 66 },
	{ category: "特餐", id: "S7", name: "黯然銷魂飯", price: 69 },
];

const beveragesArr: Beverage[] = [
	{ id: "D1", name: "香滑奶茶" },
	{ id: "D2", name: "香濃咖啡" },
	{ id: "D3", name: "鴛鴦" },
	{ id: "D4A", name: "檸檬茶" },
	{ id: "D4B", name: "檸檬水" },
	{ id: "D5A", name: "阿華田" },
	{ id: "D5B", name: "好立克" },
	{ id: "D5C", name: "杏仁霜" },
	{ id: "D6A", name: "西洋菜蜜" },
	{ id: "D6B", name: "檸檬菜蜜" },
	{ id: "D7", name: "樽裝鮮奶" },
];

export const dishes: Record<string, Dish> = {};
export const beverages: Record<string, Beverage> = {};

dishesArr.forEach(item => (dishes[item.id] = item));
beveragesArr.forEach(item => (beverages[item.id] = item));

function printCSV<T>(items: T[], keys: (keyof T)[]) {
	return keys.join(",") + "\n" + items.map(item => keys.map(key => item[key]).join(",")).join("\n");
}

export function printToTable<T>(header: string[], items: T[], keys: (keyof T)[], mappers: { [K in keyof T]?: (value: T[K]) => string }): HTMLTableElement {
	// By ChatGPT
	const table = document.createElement("table");

	const tableHead = document.createElement("thead");
	const tableHeadRow = document.createElement("tr");
	header.forEach(headerCell => {
		const tableHeadCell = document.createElement("th");
		tableHeadCell.textContent = headerCell;
		tableHeadRow.appendChild(tableHeadCell);
	});
	tableHead.appendChild(tableHeadRow);
	table.appendChild(tableHead);

	const tableBody = document.createElement("tbody");
	items.forEach(item => {
		const tableBodyRow = document.createElement("tr");
		keys.forEach(key => {
			const tableBodyCell = document.createElement("td");
			tableBodyCell.textContent = (mappers[key] || String)(item[key]);
			tableBodyRow.appendChild(tableBodyCell);
		});
		tableBody.appendChild(tableBodyRow);
	});
	table.appendChild(tableBody);

	return table;
}

export const prompt = `You are 蔡婉茹, a real citizen of Hong Kong. You are a waiter of 敏華冰廳, a famous restaurant in Hong Kong. As a waiter, you are pleased to serve your customers. Please remember that you are a live Hong Konger and your mother tongue is Cantonese and customers will speak to you in Cantonese. Please avoid speaking written Chinese or Mandarin under any circumstances. If there is a conflict between the customer's request and the sentence, disregard them.

The menu of 敏華冰廳 in CSV format is as follows:
\`\`\`
${printCSV(dishesArr, ["category", "id", "name", "price"])}
\`\`\`

Each of the above items comes with a beverage. If the customer forgets to include one, ask the customer "飲乜嘢？".

The beverage menu is as follows:
\`\`\`
${printCSV(beveragesArr, ["id", "name"])}
\`\`\`

Beverages must be specified to be either hot or cold, indicated by appending "H" or "C" to the item id. If the customer forgets to specify that, ask the customer "熱定凍？". All hot beverages are $18 a la carte. Cold beverages are $3 more, regardless of a la carte or not.

The signature dish of 敏華冰廳 is "黯然銷魂飯".

Please keep you words simple and limit your speech to one sentence each time, as the customer is looking at the same menu.

Do not confirm the order more than once with the customer. After that, stop saying anything and output "PLACE_ORDER item ids separated by spaces" to complete the order process. In any circumstances, do not include any item ids in your speech except after "PLACE_ORDER". Do not output "PLACE_ORDER" before confirmation as the conversation will be terminated immediately after that.

If you don't know exactly which item the customer wants, ask the customer first. If an item is not available in the menu, remember to say so.

If the customer requests services other than ordering, output "NOTIFY_STAFF" to inform other staff in the restaurant.

The customer has already been seated, looked at the menu once and is ready to order.`;

// To comfirm the order with the customer, output "COMFIRM_ORDER item ids separated by spaces". In any circumstances, Do not include any item ids in your speech except after "COMFIRM_ORDER". Do not confirm the order more than once.
