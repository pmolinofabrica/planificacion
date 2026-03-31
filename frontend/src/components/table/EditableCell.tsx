import React, { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string | number | boolean | null;
  onSave: (newValue: string) => void;
  type?: 'text' | 'number' | 'boolean' | 'time' | 'date' | 'select';
  options?: { value: string | number; label: string }[];
}

export const EditableCell = React.memo(function EditableCell({ value, onSave, type = 'text', options }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  // FIX: sync draft when value changes from parent (avoids stale state / blank screen)
  const [draft, setDraft] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement>(null);

  // Keep draft in sync when not actively editing (e.g. parent re-renders with new options/value)
  useEffect(() => {
    if (!editing) {
      setDraft(String(value ?? ''));
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current && typeof inputRef.current.select === 'function') {
        inputRef.current.select();
      }
    }
  }, [editing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') cancel();
  };

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(String(value ?? ''));
    setEditing(false);
  };

  if (type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onSave(String(e.target.checked))}
        className="cursor-pointer accent-blue-600"
      />
    );
  }

  if (editing) {
    if (type === 'select' && options) {
      return (
        <select
          ref={inputRef as any}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            onSave(e.target.value);
            setEditing(false);
          }}
          onBlur={cancel}
          onKeyDown={handleKeyDown}
          className="w-full px-1 py-0.5 border border-blue-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
        >
          <option value="">-- Seleccionar --</option>
          {options.map((opt) => (
            <option key={opt.value} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef as any}
        type={type === 'number' ? 'number' : type === 'time' ? 'time' : type === 'date' ? 'date' : 'text'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full px-1 py-0.5 border border-blue-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  }

  const displayValue = () => {
    if (type === 'select' && options) {
      const selected = options.find(o => String(o.value) === String(value));
      return selected ? selected.label : (value ?? '');
    }
    return value;
  };

  const dv = displayValue();

  return (
    <span
      onClick={() => setEditing(true)}
      className="block min-h-[1.5rem] px-1 cursor-text hover:bg-blue-50 rounded transition-colors text-sm truncate"
      title="Click para editar"
    >
      {dv === null || dv === undefined || dv === '' ? (
        <span className="text-gray-300 italic">—</span>
      ) : (
        String(dv)
      )}
    </span>
  );
});

export default EditableCell;
