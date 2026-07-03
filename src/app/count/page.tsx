"use client";

import React, { useEffect, useState } from 'react';

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

export default function Page() {
	const [products, setProducts] = useState<Product[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [locations, setLocations] = useState<Location[]>([]);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [locationId, setLocationId] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedCategory, setSelectedCategory] = useState('All');
	const [lines, setLines] = useState<Record<string, { full_bottles: number; leftover_ml: number }>>({});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		async function load() {
			const [b, sessionsRes] = await Promise.all([
				fetch('/api/v1/bootstrap'),
				fetch('/api/v1/sessions'),
			]);

			if (!b.ok) {
				alert('Failed to load bootstrap data');
				return;
			}

			if (!sessionsRes.ok) {
				alert('Failed to load sessions');
				return;
			}

			const bootstrapData = await b.json();
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
		// If we have session and location, try to load existing lines
		if (!sessionId || !locationId) return;
		(async () => {
			const res = await fetch(`/api/v1/sessions/${sessionId}/lines?location_id=${locationId}`);
			if (!res.ok) return;
			const body = await res.json();
			const map: Record<string, { full_bottles: number; leftover_ml: number }> = {};
			(body.lines ?? []).forEach((l: any) => {
				map[l.product_id] = { full_bottles: l.full_bottles ?? 0, leftover_ml: l.leftover_ml ?? 0 };
			});
			setLines(map);
		})();
	}, [sessionId, locationId]);

	useEffect(() => {
		if (!sessionId) return;
		setLines({});
	}, [sessionId]);

	function updateLine(productId: string, patch: Partial<{ full_bottles: number; leftover_ml: number }>) {
		setLines((prev) => ({
			...prev,
			[productId]: { full_bottles: prev[productId]?.full_bottles ?? 0, leftover_ml: prev[productId]?.leftover_ml ?? 0, ...patch },
		}));
	}

	const filteredProducts = products.filter((product) => {
		const categoryName = categories.find((cat) => cat.id === product.category_id)?.name ?? '';
		const normalizedSearch = searchTerm.trim().toLowerCase();

		if (selectedCategory !== 'All' && categoryName !== selectedCategory) {
			return false;
		}

		if (!normalizedSearch) return true;

		return (
			product.name.toLowerCase().includes(normalizedSearch) ||
			(product.sku?.toLowerCase().includes(normalizedSearch) ?? false)
		);
	});

	const categoryOptions = ['All', ...categories.map((category) => category.name)];

	async function saveCounts(showAlert = true) {
		if (!sessionId || !locationId) {
			if (showAlert) alert('Missing session or location');
			return false;
		}
		const payload = {
			location_id: locationId,
			lines: Object.entries(lines)
				.map(([product_id, vals]) => ({ product_id, full_bottles: vals.full_bottles || 0, leftover_ml: vals.leftover_ml || 0 }))
					.filter((l) => l.full_bottles > 0 || l.leftover_ml > 0),
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
		<div style={{ padding: 16 }}>
			<h1>Mobile Count (functional)</h1>

			<div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', paddingTop: 16, paddingBottom: 8, borderBottom: '1px solid #ddd' }}>
				<div style={{ marginBottom: 8 }}>
					<label htmlFor="count-search" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
						Search products
					</label>
					<input
						id="count-search"
						type="search"
						placeholder="Search by product name or SKU"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #cbd5e1', outline: 'none' }}
					/>
				</div>

				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
					{categoryOptions.map((category) => (
						<button
							key={category}
							type="button"
							onClick={() => setSelectedCategory(category)}
							style={{
								padding: '8px 12px',
								borderRadius: 9999,
								border: selectedCategory === category ? '1px solid #0f766e' : '1px solid #cbd5e1',
								background: selectedCategory === category ? '#0f766e' : '#f8fafc',
								color: selectedCategory === category ? '#f8fafc' : '#334155',
								cursor: 'pointer',
							}}
						>
							{category}
						</button>
					))}
				</div>
			</div>

			<div style={{ marginBottom: 12 }}>
				<label>Session: </label>
				<select value={sessionId ?? ''} onChange={(e) => setSessionId(e.target.value || null)}>
					<option value="">-- select --</option>
					{sessions.map((session) => (
						<option key={session.id} value={session.id}>
							{session.name} {session.count_date ? `(${session.count_date})` : ''}
						</option>
					))}
				</select>
			</div>

			<div style={{ marginTop: 12 }}>
				<label>Location: </label>
				<select value={locationId ?? ''} onChange={(e) => setLocationId(e.target.value || null)}>
					<option value="">-- select --</option>
					{locations.map((loc) => (
						<option key={loc.id} value={loc.id}>
							{loc.name}
						</option>
					))}
				</select>
			</div>

			<div style={{ marginTop: 12 }}>
				{filteredProducts.length === 0 ? (
					<div style={{ padding: 16, color: '#475569' }}>No products match that search or filter.</div>
				) : (
					filteredProducts.map((p) => {
						const productLine = lines[p.id] ?? { full_bottles: 0, leftover_ml: 0 };
						const isCounted = productLine.full_bottles > 0 || productLine.leftover_ml > 0;
						return (
							<div key={p.id} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
									<div>
										<div style={{ fontWeight: 600 }}>{p.name}</div>
										<div style={{ fontSize: 12, color: '#64748b' }}>{p.sku ?? ''}</div>
									</div>
									<div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
										{isCounted ? (
											<span style={{ background: '#16a34a', color: '#fff', borderRadius: 9999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
												{p.count_mode === 'fractional'
													? `${productLine.full_bottles} + ${productLine.leftover_ml}ml`
													: `${productLine.full_bottles}`}
											</span>
										) : (
											<span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 9999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
												Not counted
											</span>
										)}
									</div>
								</div>
								{p.count_mode === 'fractional' ? (
									<div>
										<label>Full bottles: </label>
										<input
											type="number"
											value={productLine.full_bottles}
											onChange={(e) => updateLine(p.id, { full_bottles: parseInt(e.target.value || '0', 10) })}
										/>
										<label style={{ marginLeft: 8 }}>Leftover ml: </label>
										<input
											type="number"
											value={productLine.leftover_ml}
											onChange={(e) => updateLine(p.id, { leftover_ml: parseInt(e.target.value || '0', 10) })}
										/>
									</div>
								) : (
									<div>
										<label>Count: </label>
										<input
											type="number"
											value={productLine.full_bottles}
											onChange={(e) => updateLine(p.id, { full_bottles: parseInt(e.target.value || '0', 10) })}
										/>
									</div>
								)}
							</div>
						);
					})
				)}
			</div>

			<div style={{ marginTop: 12 }}>
				<button onClick={() => saveCounts()} disabled={loading || !locationId || !sessionId}>
					Save
				</button>
				<button onClick={() => submitCounts()} disabled={loading || !locationId || !sessionId} style={{ marginLeft: 8 }}>
					Submit
				</button>
			</div>
		</div>
	);
}

