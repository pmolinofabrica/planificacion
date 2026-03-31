// Generic types for the editable table system

export type RowStatus = 'original' | 'modified' | 'new' | 'deleted';

export interface TrackedRow<T extends object> {
  _id: string;        // unique client-side ID (rownum or uuid)
  _status: RowStatus;
  _original: T | null; // null if new row
  data: T;
}

export interface DiffResult<T extends object> {
  inserts: T[];
  updates: { id: unknown; changes: Partial<T> }[];
  deletes: unknown[]; // list of PKs
}

export interface BatchError {
  index: number;
  row: unknown;
  error: string;
}

export interface BatchResult<T> {
  successes: T[];
  failures: BatchError[];
}
