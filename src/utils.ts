// By ChatGPT

export function printToTable<T>(
	table: HTMLTableElement,
	caption: HTMLTableCaptionElement,
	header: string[],
	items: T[],
	keys: (keyof T)[],
	mappers: { [K in keyof T]?: (value: T[K]) => string }
) {
	table.textContent = "";
	table.appendChild(caption);

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
}

export function createTableRow(head: string, value: string) {
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

type ReceiptItem = {
	name: string;
	price: number;
};

type GatheredReceiptItem = {
	name: string;
	amount: number;
	price: number;
};

export function gatherReceiptItems(receipt: ReceiptItem[]): GatheredReceiptItem[] {
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
