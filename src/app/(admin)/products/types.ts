export type Category = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  category_name: string | null;
  capacity_ml: number;
  count_mode: 'fractional' | 'unit';
  price_per_unit: string | null;
  unit: string;
  is_active: boolean;
};
