"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Field = { id: string; entity_id: string; key: string; label: string; data_type: string; required: boolean; options?: string[]; validation?: Record<string, unknown> };
type Entity = { id: string; key: string; label: string; description: string };
type Bootstrap = { workspaceId: string; deploymentId: string; runtimeSchemaVersion: number; entities: Entity[]; fields: Field[]; relationships: Record<string, unknown>[]; views: Record<string, unknown>[]; workflows: Record<string, unknown>[]; automations: Record<string, unknown>[]; reports: Record<string, unknown>[] };
type RecordItem = { id: string; recordKey: string; recordVersion: number; createdAt: string; updatedAt: string; values: Record<string, unknown> };

export default function RuntimeWorkspace() {
  const router = useRouter();
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { void loadBootstrap(); }, []);
  useEffect(() => { if (bootstrap && selectedKey) void loadRecords(selectedKey); }, [bootstrap, selectedKey]);

  async function loadBootstrap() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/v1/runtime/bootstrap");
      const data = await response.json() as { error?: { message?: string }; entities?: Entity[] } & Partial<Bootstrap>;
      if (response.status === 404) { setBootstrap(null); return; }
      if (!response.ok) throw new Error(data.error?.message ?? "Unable to load the active workspace.");
      const runtime = data as Bootstrap;
      setBootstrap(runtime);
      const first = runtime.entities?.[0]?.key ?? "";
      setSelectedKey(first);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load the active workspace."); }
    finally { setLoading(false); }
  }

  async function loadRecords(entityKey: string, cursor?: string) {
    setRecordsLoading(true); setError("");
    try {
      const query = new URLSearchParams({ limit: "25", fields: fieldsFor(entityKey).map((field) => field.key).join(",") });
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(`/api/v1/runtime/entities/${encodeURIComponent(entityKey)}/records?${query}`);
      const data = await response.json() as { records?: RecordItem[]; nextCursor?: string | null; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "Unable to load records.");
      setRecords(cursor ? (current) => [...current, ...(data.records ?? [])] : (data.records ?? []));
      setNextCursor(data.nextCursor ?? null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load records."); }
    finally { setRecordsLoading(false); }
  }

  function fieldsFor(entityKey: string) {
    const entity = bootstrap?.entities.find((item) => item.key === entityKey);
    return (bootstrap?.fields ?? []).filter((field) => field.entity_id === entity?.id);
  }

  const selectedEntity = bootstrap?.entities.find((entity) => entity.key === selectedKey) ?? null;
  const selectedFields = useMemo(() => fieldsFor(selectedKey), [bootstrap, selectedKey]);
  const visibleFields = selectedFields.slice(0, 6);

  function openRecord(record: RecordItem) {
    setSelectedRecord(record); setEditing(false); setFormValues(record.values);
  }

  function startCreate() {
    setSelectedRecord(null); setEditing(true); setFormValues({}); setNotice("");
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedKey || !selectedEntity) return;
    setError(""); setNotice("");
    try {
      const isEdit = Boolean(selectedRecord);
      const response = await fetch(`/api/v1/runtime/entities/${encodeURIComponent(selectedKey)}/records${isEdit ? `/${selectedRecord?.id}` : ""}`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { expectedVersion: selectedRecord?.recordVersion, values: formValues } : { values: formValues }),
      });
      const data = await response.json() as { record?: RecordItem; error?: { code?: string; message?: string } };
      if (!response.ok) {
        if (data.error?.code === "stale_record_version") throw new Error("This record changed elsewhere. Reload it before saving your changes.");
        throw new Error(data.error?.message ?? "Unable to save record.");
      }
      setNotice(isEdit ? "Record updated." : "Record created."); setEditing(false); setSelectedRecord(data.record ?? null); await loadRecords(selectedKey);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save record."); }
  }

  if (loading) return <main className="runtime-shell runtime-centered"><span className="runtime-mark">N</span><p>Loading your generated workspace...</p></main>;
  if (error && !bootstrap) return <main className="runtime-shell runtime-centered"><div className="runtime-empty"><span className="runtime-kicker">NORTHSTAR WORKSPACE</span><h1>We couldn&apos;t open the active system.</h1><p>{error}</p><button type="button" onClick={() => router.push("/system-builder")}>Return to Command Canvas <b>↗</b></button></div></main>;
  if (!bootstrap) return <main className="runtime-shell runtime-centered"><div className="runtime-empty"><span className="runtime-kicker">NORTHSTAR WORKSPACE</span><h1>No active runtime deployment.</h1><p>Northstar has not found an active generated deployment for this workspace yet.</p><button type="button" onClick={() => router.push("/system-builder")}>Open Command Canvas <b>↗</b></button></div></main>;

  return <main className="runtime-shell">
    <header className="runtime-header"><button className="runtime-brand" type="button" onClick={() => router.push("/")}><span>✦</span><b>NORTHSTAR</b></button><div className="runtime-header-meta"><span><i /> ACTIVE SYSTEM</span><small>Runtime {bootstrap.runtimeSchemaVersion}</small><button type="button" onClick={() => router.push("/system-builder")}>Command Canvas ↗</button></div></header>
    <div className="runtime-layout">
      <aside className="runtime-sidebar"><div className="runtime-side-kicker">GENERATED WORKSPACE</div><h1>Your operating system</h1><p>Built from the way your business works.</p><nav aria-label="Generated entities">{bootstrap.entities.map((entity) => <button className={selectedKey === entity.key ? "active" : ""} key={entity.key} type="button" onClick={() => { setSelectedKey(entity.key); setSelectedRecord(null); setEditing(false); }}>{entity.label}<span>↗</span></button>)}</nav><div className="runtime-side-footer"><span>{bootstrap.views.length} configured views</span><span>{bootstrap.workflows.length} workflows</span><span>{bootstrap.reports.length} reports</span></div></aside>
      <section className="runtime-main"><div className="runtime-overview"><div><span className="runtime-kicker">ACTIVE DEPLOYMENT</span><h2>{selectedEntity?.label ?? "Workspace"}</h2><p>{selectedEntity?.description ?? "Select a generated entity to begin."}</p></div><button className="runtime-primary" type="button" onClick={startCreate} disabled={!selectedEntity}>New record <b>＋</b></button></div>
          {error ? <div className="runtime-alert" role="alert"><strong>Runtime or permission error</strong><br />{error}</div> : null}{notice ? <div className="runtime-notice" role="status">{notice}</div> : null}
        <div className="runtime-content-grid"><section className="runtime-records"><div className="runtime-panel-head"><div><span className="runtime-kicker">RUNTIME RECORDS</span><strong>{records.length} loaded</strong></div><button type="button" onClick={() => loadRecords(selectedKey)} disabled={recordsLoading}>↻</button></div>{recordsLoading ? <div className="runtime-panel-empty">Loading records...</div> : records.length ? <div className="runtime-table-wrap"><table><thead><tr><th>Record</th>{visibleFields.map((field) => <th key={field.key}>{field.label}</th>)}</tr></thead><tbody>{records.map((record) => <tr key={record.id} tabIndex={0} onClick={() => openRecord(record)} onKeyDown={(event) => { if (event.key === "Enter") openRecord(record); }}><td><b>{record.recordKey}</b><small>v{record.recordVersion}</small></td>{visibleFields.map((field) => <td key={field.key}>{formatValue(record.values[field.key], field.data_type)}</td>)}</tr>)}</tbody></table>{nextCursor ? <button className="runtime-more" type="button" onClick={() => loadRecords(selectedKey, nextCursor)} disabled={recordsLoading}>Load more records</button> : null}</div> : <div className="runtime-panel-empty"><span>∅</span><strong>No records yet</strong><p>Create the first record in this generated entity.</p></div>}</section>
          {editing ? <RecordEditor fields={selectedFields} values={formValues} onChange={setFormValues} onSubmit={submitRecord} onCancel={() => setEditing(false)} /> : selectedRecord ? <RecordDetail entity={selectedEntity} fields={selectedFields} record={selectedRecord} onEdit={() => setEditing(true)} /> : <section className="runtime-detail runtime-panel-empty"><span>◈</span><strong>Select a record</strong><p>Choose a runtime record to inspect its fields and relationships.</p></section>}
        </div>
      </section>
    </div>
  </main>;
}

function RecordDetail({ entity, fields, record, onEdit }: { entity: Entity | null; fields: Field[]; record: RecordItem; onEdit: () => void }) { return <section className="runtime-detail"><div className="runtime-panel-head"><div><span className="runtime-kicker">RECORD DETAIL</span><strong>{record.recordKey}</strong></div><button className="runtime-secondary" type="button" onClick={onEdit}>Edit</button></div><p className="runtime-detail-caption">{entity?.label} · Version {record.recordVersion}</p><dl>{fields.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{formatValue(record.values[field.key], field.data_type)}</dd></div>)}</dl></section>; }

function RecordEditor({ fields, values, onChange, onSubmit, onCancel }: { fields: Field[]; values: Record<string, unknown>; onChange: (values: Record<string, unknown>) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) { return <form className="runtime-editor" onSubmit={onSubmit}><div className="runtime-panel-head"><div><span className="runtime-kicker">RUNTIME FORM</span><strong>Record fields</strong></div><button type="button" onClick={onCancel}>×</button></div>{fields.length ? fields.map((field) => <label key={field.key}><span>{field.label}{field.required ? " *" : ""}</span><FieldInput field={field} value={values[field.key]} onChange={(value) => onChange({ ...values, [field.key]: value })} /> </label>) : <p>There are no editable fields in this entity.</p>}<div className="runtime-editor-actions"><button className="runtime-secondary" type="button" onClick={onCancel}>Cancel</button><button className="runtime-primary" type="submit">Save record <b>→</b></button></div></form>; }

function FieldInput({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) { const common = { value: value == null ? "" : String(value), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value), required: field.required, }; if (field.data_type === "textarea") return <textarea {...common} rows={3} />; if (field.data_type === "select") return <select {...common}><option value="">Choose...</option>{(field.options ?? []).map((option) => <option value={option} key={option}>{option}</option>)}</select>; if (field.data_type === "boolean") return <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />; if (field.data_type === "number" || field.data_type === "currency") return <input {...common} type="number" step="any" />; if (field.data_type === "date") return <input {...common} type="date" />; if (["text", "email"].includes(field.data_type)) return <input {...common} type={field.data_type} />; return <textarea {...common} rows={2} placeholder="Unsupported field type: enter JSON-compatible text" />; }

function formatValue(value: unknown, type: string) { if (value === null || value === undefined || value === "") return "—"; if (type === "boolean") return value ? "Yes" : "No"; if (typeof value === "object") return JSON.stringify(value); return String(value); }
