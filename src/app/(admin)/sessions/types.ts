export type Session = {
  id: string;
  name: string;
  count_date: string;
  status: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
};
