import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

/* snake_case <-> camelCase helpers so the app can keep using camelCase
   while Postgres columns stay in normal snake_case */
const toSnake = (s) => s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

export function toDbRow(obj) {
  const out = {};
  for (const k in obj) out[toSnake(k)] = obj[k];
  return out;
}
export function fromDbRow(row) {
  const out = {};
  for (const k in row) out[toCamel(k)] = row[k];
  return out;
}

export async function fetchTable(table, orderBy = "created_at", ascending = true) {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select("*").order(orderBy, { ascending });
  if (error) {
    console.error(`fetch ${table} failed`, error);
    return [];
  }
  return (data || []).map(fromDbRow);
}

export async function upsertRow(table, row) {
  if (!supabase) return row;
  const { data, error } = await supabase.from(table).upsert(toDbRow(row)).select();
  if (error) {
    console.error(`upsert ${table} failed`, error);
    alert("تعذّر الحفظ في قاعدة البيانات: " + error.message);
    throw error;
  }
  return data && data[0] ? fromDbRow(data[0]) : row;
}

export async function deleteRow(table, id) {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error(`delete from ${table} failed`, error);
    alert("تعذّر الحذف من قاعدة البيانات: " + error.message);
  }
}
