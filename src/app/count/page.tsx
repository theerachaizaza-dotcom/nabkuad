"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { IBM_Plex_Mono, Sarabun } from 'next/font/google';

type Product = {
	id: string;
	name: string;
	sku?: string | null;
	count_mode: string;
	category_id?: string | null;
	capacity_ml?: number;
};

type Session = {
	id: string;
	name: string;
	count_date?: string;
};

type Location = {
	id: string;
	name: string;
};

type Category = {
	id: string;
	name: string;
};

type LineState = {
	full_bottles: number;
	leftover_ml: number;
};

type DraftState = Record<'full_bottles' | 'leftover_ml', string>;

const EMPTY_LINE: LineState = { full_bottles: 0, leftover_ml: 0 };
const ALL_CATEGORY = 'All';
const sarabun = Sarabun({ subsets: ['latin', 'thai'], weight: ['400', '500', '600', '700', '800'] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600', '700'] });

export default function Page() {
	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [locations, setLocations] = useState<Location[]>([]);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [locationId, setLocationId] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
	const [lines, setLines] = useState<Record<string, LineState>>({});
	const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		async function load() {
			const [bootstrapRes, sessionsRes] = await Promise.all([
				fetch('/api/v1/bootstrap'),
				fetch('/api/v1/sessions'),
			]);

			if (!bootstrapRes.ok || !sessionsRes.ok) {
				alert('Failed to load inventory data');
				return;
			}

			const bootstrapData = await bootstrapRes.json();
			const sessionsData = await sessionsRes.json();

			setProducts(bootstrapData.products ?? []);
			setCategories(bootstrapData.categories ?? []);
			setLocations(bootstrapData.locations ?? []);
			setSessions(sessionsData.sessions ?? []);
			setSessionId((sessionsData.sessions ?? [])[0]?.id ?? null);
			setLocationId((bootstrapData.locations ?? [])[0]?.id ?? null);
		}

		load();
	}, []);

	useEffect(() => {
		if (!sessionId || !locationId) return;
		(async () => {
			const res = await fetch(`/api/v1/sessions/${sessionId}/lines?location_id=${locationId}`);
			if (!res.ok) return;
			const body = await res.json();
			const map: Record<string, LineState> = {};
			(body.lines ?? []).forEach((line: any) => {
				map[line.product_id] = {
					full_bottles: line.full_bottles ?? 0,
					leftover_ml: line.leftover_ml ?? 0,
				};
			});
			setLines(map);
		})();
	}, [sessionId, locationId]);

	useEffect(() => {
		if (!sessionId) {
			setLines({});
			setDrafts({});
			return;
		}
		setLines({});
		setDrafts({});
	}, [sessionId]);

	const categoryNameByProductId = useMemo(() => {
		const map = new Map<string, string>();
		products.forEach((product) => {
			map.set(product.id, categories.find((category) => category.id === product.category_id)?.name ?? 'Uncategorized');
		});
		return map;
	}, [products, categories]);

	const categoryOptions = useMemo(() => [ALL_CATEGORY, ...categories.map((category) => category.name)], [categories]);

	const filteredProducts = useMemo(() => {
		const normalizedSearch = searchTerm.trim().toLowerCase();

		return products.filter((product) => {
			const categoryName = categoryNameByProductId.get(product.id) ?? 'Uncategorized';
			if (selectedCategory !== ALL_CATEGORY && categoryName !== selectedCategory) return false;
			if (!normalizedSearch) return true;
			return product.name.toLowerCase().includes(normalizedSearch) || (product.sku?.toLowerCase().includes(normalizedSearch) ?? false);
		});
	}, [products, categoryNameByProductId, searchTerm, selectedCategory]);

	const countedProducts = filteredProducts.filter((product) => {
		const line = lines[product.id] ?? EMPTY_LINE;
		return line.full_bottles > 0 || line.leftover_ml > 0;
	}).length;

	const progressPercent = filteredProducts.length ? (countedProducts / filteredProducts.length) * 100 : 0;
	const currentCategoryName = selectedCategory === ALL_CATEGORY ? 'สินค้าทั้งหมด' : selectedCategory;
	const categoryNames = categories.map((category) => category.name);
	const nextCategoryName = categoryNames[categoryNames.indexOf(selectedCategory) + 1] ?? null;

	function updateLine(productId: string, patch: Partial<LineState>) {
		setLines((prev) => ({
			...prev,
			[productId]: {
				full_bottles: prev[productId]?.full_bottles ?? 0,
				leftover_ml: prev[productId]?.leftover_ml ?? 0,
				...patch,
			},
		}));
	}

	function updateDraft(productId: string, key: keyof LineState, value: string) {
		setDrafts((prev) => ({
			...prev,
			[productId]: {
				...(prev[productId] ?? { full_bottles: '0', leftover_ml: '0' }),
				[key]: value,
			},
		}));
	}

	function getDraftValue(productId: string, key: keyof LineState) {
		return drafts[productId]?.[key] ?? String(lines[productId]?.[key] ?? EMPTY_LINE[key]);
	}

	function adjustLine(productId: string, key: keyof LineState, delta: number) {
		const product = products.find((item) => item.id === productId);
		if (!product) return;

		const current = lines[productId] ?? EMPTY_LINE;
		const nextValue = Math.max(0, current[key] + delta);
		const capacityMl = product.capacity_ml ?? 0;

		if (product.count_mode === 'fractional' && key === 'leftover_ml' && capacityMl > 0) {
			const extraFull = Math.floor(nextValue / capacityMl);
			const leftoverMl = nextValue % capacityMl;
			updateLine(productId, {
				full_bottles: current.full_bottles + extraFull,
				leftover_ml: leftoverMl,
			});
			updateDraft(productId, 'full_bottles', String(current.full_bottles + extraFull));
			updateDraft(productId, 'leftover_ml', String(leftoverMl));
			return;
		}

		updateLine(productId, { [key]: nextValue } as Partial<LineState>);
		updateDraft(productId, key, String(nextValue));
	}

	function handleInputChange(productId: string, key: keyof LineState, value: string) {
		const digits = value.replace(/\D/g, '');
		updateDraft(productId, key, digits);
		const numericValue = Number.parseInt(digits || '0', 10);
		const safeValue = Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
		updateLine(productId, { [key]: safeValue } as Partial<LineState>);
	}

	function handleInputBlur(productId: string, key: keyof LineState) {
		const product = products.find((item) => item.id === productId);
		if (!product) return;

		const current = lines[productId] ?? EMPTY_LINE;
		const draftValue = Number.parseInt(getDraftValue(productId, key) || '0', 10);
		const safeValue = Number.isFinite(draftValue) ? Math.max(0, draftValue) : 0;

		if (product.count_mode === 'fractional' && key === 'leftover_ml' && (product.capacity_ml ?? 0) > 0) {
			const capacity = product.capacity_ml ?? 0;
			const extraFull = Math.floor(safeValue / capacity);
			const leftoverMl = safeValue % capacity;
			updateLine(productId, {
				full_bottles: current.full_bottles + extraFull,
				leftover_ml: leftoverMl,
			});
			updateDraft(productId, 'full_bottles', String(current.full_bottles + extraFull));
			updateDraft(productId, 'leftover_ml', String(leftoverMl));
			return;
		}

		updateLine(productId, { [key]: safeValue } as Partial<LineState>);
		updateDraft(productId, key, String(safeValue));
	}

	function getLine(productId: string): LineState {
		return lines[productId] ?? EMPTY_LINE;
	}

	function getNetValue(product: Product, line: LineState) {
		if (product.count_mode === 'unit') {
			return line.full_bottles;
		}
		const capacity = product.capacity_ml ?? 1;
		return line.full_bottles + line.leftover_ml / capacity;
	}

	function countCategory(categoryName: string) {
		const categoryProducts = products.filter((product) => (categoryNameByProductId.get(product.id) ?? 'Uncategorized') === categoryName);
		if (!categoryProducts.length) return '0/0';
		const counted = categoryProducts.filter((product) => {
			const line = lines[product.id] ?? EMPTY_LINE;
			return line.full_bottles > 0 || line.leftover_ml > 0;
		}).length;
		return `${counted}/${categoryProducts.length}`;
	}

	function nextCategory() {
		if (!categoryNames.length) return;
		const index = categoryNames.indexOf(selectedCategory);
		const nextName = categoryNames[index + 1] ?? categoryNames[0];
		setSelectedCategory(nextName);
	}

	async function saveCounts(showAlert = true) {
		if (!sessionId || !locationId) {
			if (showAlert) alert('Missing session or location');
			return false;
		}

		const payload = {
			location_id: locationId,
			lines: Object.entries(lines)
				.map(([product_id, values]) => ({ product_id, full_bottles: values.full_bottles || 0, leftover_ml: values.leftover_ml || 0 }))
				.filter((line) => line.full_bottles > 0 || line.leftover_ml > 0),
		};

		setLoading(true);
		const res = await fetch(`/api/v1/sessions/${sessionId}/counts`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		setLoading(false);

		if (!res.ok) {
			if (showAlert) {
				const txt = await res.text();
				alert('Save failed: ' + txt);
			}
			return false;
		}

		if (showAlert) alert('Saved');
		return true;
	}

	async function submitCounts() {
		if (!sessionId || !locationId) return alert('Missing session or location');
		const saved = await saveCounts(false);
		if (!saved) return;
		setLoading(true);
		const res = await fetch(`/api/v1/sessions/${sessionId}/submit`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ location_id: locationId }),
		});
		setLoading(false);
		if (!res.ok) {
			const txt = await res.text();
			alert('Submit failed: ' + txt);
		} else {
			alert('Submitted');
		}
	}

	return (
		<div className={`count-shell ${sarabun.className}`}>
			<style jsx global>{`
				:root {
					--bg: #000000;
					--card: #12181C;
					--card2: #1A2228;
					--grad1: #141C20;
					--grad2: #0E1417;
					--line: #232D33;
					--line2: #31404a;
					--mint: #2FD196;
					--mint-soft: rgba(47, 209, 150, 0.14);
					--text: #F2F5F6;
					--muted: #8A99A0;
					--muteder: #5B6B72;
				}
				* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
				body { background: var(--bg); color: var(--text); font-family: 'Sarabun', sans-serif; }
				.mono { font-family: ${ibmPlexMono.style.fontFamily}; }
				.count-shell {
					max-width: 480px;
					margin: 0 auto;
					min-height: 100vh;
					background: var(--bg);
					color: var(--text);
					padding-bottom: 120px;
				}
				.brandbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; }
				.brand { font-size: 21px; font-weight: 800; letter-spacing: -0.01em; }
				.brand .fp { color: #fff; }
				.brand .p { color: var(--mint); }
				.avatar { width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid var(--line2); background: var(--card); }
				header { position: sticky; top: 0; z-index: 50; background: var(--bg); padding: 4px 16px 12px; }
				.loc-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 10px; }
				.loc-pick { display: flex; align-items: center; gap: 9px; background: var(--card2); border: 1px solid var(--line2); border-radius: 14px; padding: 9px 14px; font-size: 15px; font-weight: 700; color: var(--text); }
				.loc-pick .pin { width: 8px; height: 8px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px var(--mint); }
				.sess { font-size: 12px; color: var(--muted); text-align: right; line-height: 1.35; }
				.sess b { color: var(--text); font-weight: 700; display: block; }
				.search { position: relative; margin-bottom: 12px; }
				.search input { width: 100%; background: var(--card); border: 1px solid var(--line2); color: var(--text); border-radius: 16px; padding: 14px 16px 14px 44px; font-family: inherit; font-size: 15.5px; font-weight: 500; }
				.search input::placeholder { color: var(--muteder); font-weight: 400; }
				.search .ico { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 16px; }
				.search .clr { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); background: var(--card2); border: 0; width: 28px; height: 28px; border-radius: 50%; font-size: 15px; display: none; }
				.chips { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
				.chips::-webkit-scrollbar { display: none; }
				.chip { flex: 0 0 auto; background: var(--card); border: 1px solid transparent; color: var(--muted); font-family: inherit; font-size: 14px; font-weight: 600; padding: 9px 17px; border-radius: 999px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 8px; }
				.chip.on { background: var(--mint); color: #04241a; font-weight: 700; box-shadow: 0 0 16px rgba(47, 209, 150, 0.4); }
				.chip .cnt { font-family: 'IBM Plex Mono', monospace; font-size: 11px; opacity: 0.65; font-weight: 600; }
				.chip.done:not(.on) { color: var(--mint); }
				.cat-head { padding: 16px 18px 12px; display: flex; align-items: flex-end; justify-content: space-between; }
				.cat-head .name { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
				.cat-head .prog { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: var(--muted); font-weight: 600; }
				.cat-head .prog b { color: var(--mint); }
				.bar { height: 4px; background: var(--card2); margin: 0 18px; border-radius: 3px; overflow: hidden; }
				.bar > i { display: block; height: 100%; background: var(--mint); width: 0%; transition: 0.35s; box-shadow: 0 0 10px rgba(47, 209, 150, 0.5); }
				.list { padding: 10px 14px 130px; }
				.row { background: linear-gradient(155deg, var(--grad1), var(--grad2)); border: 1px solid var(--line); border-radius: 20px; padding: 15px 16px; margin-bottom: 11px; }
				.row.counted { border-color: rgba(47, 209, 150, 0.45); background: linear-gradient(155deg, rgba(47, 209, 150, 0.07), var(--grad2)); }
				.row-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
				.row-name { font-size: 16px; font-weight: 700; line-height: 1.3; }
				.row-sku { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: var(--muteder); margin-top: 3px; font-weight: 500; }
				.tag { flex: 0 0 auto; font-size: 11px; font-weight: 700; padding: 5px 11px; border-radius: 999px; white-space: nowrap; }
				.tag.no { background: var(--card2); color: var(--muteder); }
				.tag.yes { background: var(--mint-soft); color: var(--mint); }
				.inputs { display: flex; align-items: flex-end; gap: 9px; margin-top: 14px; }
				.field { flex: 1; display: flex; flex-direction: column; gap: 5px; }
				.field label { font-size: 11px; color: var(--muted); padding-left: 3px; font-weight: 600; }
				.field .box { display: flex; align-items: center; background: var(--bg); border: 1px solid var(--line2); border-radius: 13px; overflow: hidden; }
				.field .box:focus-within { border-color: var(--mint); }
				.field button { width: 40px; height: 46px; border: 0; background: transparent; color: var(--text); font-size: 24px; font-family: inherit; cursor: pointer; flex: 0 0 auto; font-weight: 400; }
				.field button:active { background: var(--mint); color: #04241a; }
				.field input { width: 100%; min-width: 0; text-align: center; background: transparent; border: 0; color: var(--text); font-family: 'IBM Plex Mono', monospace; font-size: 19px; font-weight: 700; padding: 11px 0; -moz-appearance: textfield; }
				.field input::-webkit-outer-spin-button, .field input::-webkit-inner-spin-button { -webkit-appearance: none; }
				.net { flex: 0 0 auto; text-align: right; min-width: 62px; padding-bottom: 2px; }
				.net .n { font-family: 'IBM Plex Mono', monospace; font-size: 23px; font-weight: 700; color: var(--mint); line-height: 1; }
				.net .l { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-top: 2px; }
				.unit-only .field.ml { display: none; }
				.unit-only .net { display: none; }
				.unit-note { font-size: 11.5px; color: var(--muteder); margin-top: 11px; }
				.empty { text-align: center; color: var(--muteder); padding: 60px 20px; font-size: 15px; }
				footer { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: linear-gradient(transparent, var(--bg) 24%); padding: 20px 14px 16px; z-index: 40; }
				.foot-row { display: flex; gap: 11px; }
				.next { flex: 1; background: var(--card2); border: 1px solid var(--line2); color: var(--text); font-family: inherit; font-weight: 700; font-size: 15.5px; padding: 16px; border-radius: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
				.next b { color: var(--mint); }
				.submit { flex: 1; background: var(--mint); border: 0; color: #04241a; font-family: inherit; font-weight: 800; font-size: 15.5px; padding: 16px; border-radius: 16px; cursor: pointer; box-shadow: 0 0 20px rgba(47, 209, 150, 0.35); }
				@media (max-width: 480px) { .inputs { flex-direction: column; align-items: stretch; } .net { text-align: left; min-width: 0; } }
			`}</style>

			<div className="brandbar">
				<div className="brand">
					<span className="fp">Nab</span>
					<span className="p">Kuad</span>
				</div>
				<div className="avatar" />
			</div>

			<header>
				<div className="loc-bar">
					<label className="loc-pick" style={{ cursor: 'pointer' }}>
						<span className="pin" />
						<select
							value={locationId ?? ''}
							onChange={(event) => setLocationId(event.target.value || null)}
							style={{ background: 'transparent', border: '0', color: 'inherit', font: 'inherit', outline: 'none', cursor: 'pointer' }}
						>
							{locations.map((location) => (
								<option key={location.id} value={location.id} style={{ color: '#000' }}>
									{location.name}
								</option>
							))}
						</select>
					</label>
					<div className="sess">
						<b>{sessions.find((session) => session.id === sessionId)?.name ?? 'เลือกรอบนับ'}</b>
						<select value={sessionId ?? ''} onChange={(event) => setSessionId(event.target.value || null)} style={{ background: 'transparent', border: '0', color: 'inherit', font: 'inherit', outline: 'none', cursor: 'pointer' }}>
							<option value="">-- select --</option>
							{sessions.map((session) => (
								<option key={session.id} value={session.id} style={{ color: '#000' }}>
									{session.name} {session.count_date ? `(${session.count_date})` : ''}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="search">
					<span className="ico">🔍</span>
					<input
						placeholder="ค้นหาชื่อ หรือ SKU…"
						value={searchTerm}
						autoComplete="off"
						onChange={(event) => setSearchTerm(event.target.value)}
					/>
					<button className="clr" type="button" onClick={() => setSearchTerm('')} style={{ display: searchTerm ? 'block' : 'none' }}>
						✕
					</button>
				</div>

				<div className="chips">
					{categoryOptions.map((category) => {
						const isSelected = selectedCategory === category;
						const categoryCount = category === ALL_CATEGORY ? `${countedProducts}/${products.length}` : countCategory(category);
						return (
							<button
								key={category}
								type="button"
								className={`chip${isSelected ? ' on' : ''}${category !== ALL_CATEGORY && categoryCount === `${countCategory(category).split('/')[0]}/${countCategory(category).split('/')[1]}` && countCategory(category).split('/')[0] === countCategory(category).split('/')[1] ? ' done' : ''}`}
								onClick={() => setSelectedCategory(category)}
							>
								{category}
								<span className="cnt">{categoryCount}</span>
							</button>
						);
					})}
				</div>
			</header>

			<div className="cat-head">
				<div className="name">{currentCategoryName}</div>
				<div className="prog">
					<b>{countedProducts}</b> / {filteredProducts.length} นับแล้ว
				</div>
			</div>
			<div className="bar">
				<i style={{ width: `${progressPercent}%` }} />
			</div>

			<div className="list">
				{filteredProducts.length === 0 ? (
					<div className="empty">ไม่พบสินค้า</div>
				) : (
					filteredProducts.map((product) => {
						const line = getLine(product.id);
						const isCounted = line.full_bottles > 0 || line.leftover_ml > 0;
						const unitOnly = product.count_mode === 'unit';
						const categoryName = categoryNameByProductId.get(product.id) ?? 'Uncategorized';
						return (
							<div key={product.id} className={`row${isCounted ? ' counted' : ''}${unitOnly ? ' unit-only' : ''}`}>
								<div className="row-top">
									<div>
										<div className="row-name">{product.name}</div>
										<div className="row-sku">{product.sku ?? ''} · {categoryName}</div>
									</div>
									<span className={`tag ${isCounted ? 'yes' : 'no'}`}>{isCounted ? '✓ นับแล้ว' : 'ยังไม่นับ'}</span>
								</div>

								<div className="inputs">
									<div className="field">
										<label>{unitOnly ? 'จำนวน' : 'ขวดเต็ม'}</label>
										<div className="box">
											<button type="button" onClick={() => adjustLine(product.id, 'full_bottles', -1)}>-</button>
											<input
												type="number"
												inputMode="numeric"
												value={line.full_bottles}
												onChange={(event) => handleInputChange(product.id, 'full_bottles', event.target.value)}
											/>
											<button type="button" onClick={() => adjustLine(product.id, 'full_bottles', 1)}>+</button>
										</div>
									</div>

									<div className="field ml">
										<label>เศษ (ml) · พิมพ์ได้เลย</label>
										<div className="box">
											<button type="button" onClick={() => adjustLine(product.id, 'leftover_ml', -50)}>-</button>
											<input
												className="ml-in"
												type="number"
												inputMode="numeric"
												autoComplete="off"
												pattern="[0-9]*"
												value={getDraftValue(product.id, 'leftover_ml')}
												onChange={(event) => handleInputChange(product.id, 'leftover_ml', event.target.value)}
												onBlur={() => handleInputBlur(product.id, 'leftover_ml')}
												placeholder="0"
											/>
											<button type="button" onClick={() => adjustLine(product.id, 'leftover_ml', 50)}>+</button>
										</div>
									</div>

									<div className="net">
										<div className="n">{getNetValue(product, line).toFixed(2)}</div>
										<div className="l">net</div>
									</div>
								</div>
								{unitOnly ? <div className="unit-note">สินค้าแบบ unit — นับเป็นชิ้น ไม่มีเศษ</div> : null}
							</div>
						);
					})
				)}
			</div>

			<footer>
				<div className="foot-row">
					<button className="next" type="button" onClick={() => nextCategory()}>
						ถัดไป · <b>{nextCategoryName ?? 'จบ'}</b> →
					</button>
					<button className="submit" type="button" onClick={() => submitCounts()} disabled={loading || !locationId || !sessionId}>
						{loading ? 'กำลังส่ง...' : 'ส่งยอด →'}
					</button>
				</div>
			</footer>
		</div>
	);
}

