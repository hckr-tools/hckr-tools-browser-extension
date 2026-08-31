import React, { useMemo, useRef, useState } from 'react';
import { tableFromArrays, tableFromIPC, tableToIPC } from 'apache-arrow';
import initParquet, {
  Table as ParquetTable,
  readParquet,
  writeParquet,
} from 'parquet-wasm/esm';
import parquetWasmUrl from 'parquet-wasm/esm/parquet_wasm_bg.wasm?url';
import { copyToClipboard } from '../../shared/clipboard';
import './DummyDataGenerator.css';

type FieldKind =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'number'
  | 'lorem'
  | 'uuid'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'company'
  | 'url'
  | 'color'
  | 'constant'
  | 'list'
  | 'weighted-list'
  | 'auto-increment'
  | 'number-range';
type ExportFormat =
  | 'csv'
  | 'json'
  | 'ndjson'
  | 'avro'
  | 'parquet'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'scala'
  | 'spark-scala'
  | 'spark-pyspark'
  | 'sql';
type DataField = { id: string; name: string; kind: FieldKind; config?: string };
type DataRow = Record<string, string | number | boolean>;
type LoadedData = {
  name: string;
  format: 'Avro' | 'Parquet';
  rows: DataRow[];
  fields: string[];
  size: number;
};

const MAX_ROWS = 10000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const PAGE_SIZE = 25;
const FIRST_NAMES = [
  'Amelia',
  'Noah',
  'Olivia',
  'Liam',
  'Emma',
  'Ethan',
  'Ava',
  'Oliver',
  'Maya',
  'Henry',
];
const LAST_NAMES = [
  'Patel',
  'Kim',
  'Garcia',
  'Miller',
  'Wilson',
  'Zhang',
  'Brooks',
  'Quinn',
  'Carter',
  'Morgan',
];
const DOMAINS = ['example.com', 'test.dev', 'mail.local', 'sample.io'];
const STREETS = [
  'Maple St',
  'Oak Avenue',
  'Cedar Road',
  'Lake Drive',
  'Park Lane',
];
const CITIES = [
  'Seattle, WA',
  'Austin, TX',
  'Boston, MA',
  'Denver, CO',
  'Miami, FL',
];
const LOREM = [
  'lorem ipsum',
  'developer tools',
  'sample record',
  'local data',
  'quick brown fox',
];
const COMPANIES = [
  'Acme Labs',
  'Northstar Systems',
  'Pioneer Works',
  'Brightline Co',
  'Vertex Studio',
];
const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c'];
const FIELD_OPTIONS: { kind: FieldKind; label: string }[] = [
  { kind: 'name', label: 'Full name' },
  { kind: 'email', label: 'Email' },
  { kind: 'phone', label: 'Phone' },
  { kind: 'address', label: 'Address' },
  { kind: 'number', label: 'Number' },
  { kind: 'lorem', label: 'Text' },
  { kind: 'uuid', label: 'UUID' },
  { kind: 'boolean', label: 'Boolean' },
  { kind: 'date', label: 'ISO date' },
  { kind: 'datetime', label: 'ISO datetime' },
  { kind: 'company', label: 'Company' },
  { kind: 'url', label: 'URL' },
  { kind: 'color', label: 'Colour' },
  { kind: 'auto-increment', label: 'Auto-increment' },
  { kind: 'number-range', label: 'Number range' },
  { kind: 'constant', label: 'Constant' },
  { kind: 'list', label: 'List' },
  { kind: 'weighted-list', label: 'Weighted list' },
];
const FIELD_CONFIG: Partial<
  Record<FieldKind, { placeholder: string; hint: string }>
> = {
  constant: { placeholder: 'e.g. active', hint: 'Fixed value' },
  list: {
    placeholder: 'e.g. basic,pro,enterprise',
    hint: 'Comma-separated values',
  },
  'weighted-list': {
    placeholder: 'e.g. basic:6,pro:3,enterprise:1',
    hint: 'Value:weight pairs',
  },
  'number-range': { placeholder: 'e.g. 10,100', hint: 'Minimum, maximum' },
};
const STARTER_SCHEMAS: { label: string; fields: Omit<DataField, 'id'>[] }[] = [
  { label: 'Names', fields: [{ name: 'name', kind: 'name' }] },
  { label: 'Emails', fields: [{ name: 'email', kind: 'email' }] },
  {
    label: 'Contact',
    fields: [
      { name: 'name', kind: 'name' },
      { name: 'email', kind: 'email' },
      { name: 'phone', kind: 'phone' },
    ],
  },
  {
    label: 'Person',
    fields: [
      { name: 'id', kind: 'uuid' },
      { name: 'name', kind: 'name' },
      { name: 'email', kind: 'email' },
      { name: 'created_at', kind: 'datetime' },
    ],
  },
  {
    label: 'Account',
    fields: [
      { name: 'account_id', kind: 'auto-increment' },
      { name: 'company', kind: 'company' },
      { name: 'owner_email', kind: 'email' },
      { name: 'plan', kind: 'list', config: 'basic,pro,enterprise' },
    ],
  },
  {
    label: 'Product',
    fields: [
      { name: 'product_id', kind: 'auto-increment' },
      { name: 'product_name', kind: 'list', config: 'Starter,Pro,Enterprise' },
      { name: 'price', kind: 'number-range', config: '9.99,199.99' },
      { name: 'active', kind: 'boolean' },
    ],
  },
  {
    label: 'Order',
    fields: [
      { name: 'order_id', kind: 'auto-increment' },
      { name: 'customer', kind: 'name' },
      { name: 'total', kind: 'number-range', config: '10,500' },
      { name: 'ordered_at', kind: 'datetime' },
    ],
  },
  {
    label: 'Website',
    fields: [
      { name: 'company', kind: 'company' },
      { name: 'website', kind: 'url' },
      { name: 'brand_color', kind: 'color' },
    ],
  },
];
const random = <T,>(values: readonly T[]): T =>
  values[Math.floor(Math.random() * values.length)];
const fieldId = () => `field-${crypto.randomUUID()}`;
const cleanName = (name: string) => name.trim().replace(/[^A-Za-z0-9_]/g, '_');
const csvEscape = (value: unknown) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;
const serializeCsv = (rows: DataRow[], fields: string[]) =>
  [
    fields.map(csvEscape).join(','),
    ...rows.map((row) =>
      fields.map((field) => csvEscape(row[field])).join(','),
    ),
  ].join('\r\n');
const serializeJson = (rows: DataRow[]) => JSON.stringify(rows, null, 2);
const serializeNdjson = (rows: DataRow[]) =>
  rows.map((row) => JSON.stringify(row)).join('\n');
const codeFormats: ExportFormat[] = [
  'javascript',
  'typescript',
  'python',
  'java',
  'scala',
  'spark-scala',
  'spark-pyspark',
  'sql',
];
const formatLabel = (format: ExportFormat) =>
  format === 'spark-pyspark'
    ? 'PySpark'
    : format === 'spark-scala'
      ? 'Spark Scala'
      : format.toUpperCase();
const fieldType = (field: string, rows: DataRow[]) => {
  const value = rows.find((row) => row[field] !== undefined)?.[field];
  return typeof value === 'boolean'
    ? 'boolean'
    : typeof value === 'number'
      ? 'number'
      : 'string';
};
function serializeCode(
  rows: DataRow[],
  fields: string[],
  format: ExportFormat,
): string {
  const json = JSON.stringify(rows, null, 2);
  const values = (row: DataRow) =>
    fields.map((field) => JSON.stringify(row[field])).join(', ');
  const fieldNames = fields.map((field) => JSON.stringify(field)).join(', ');
  if (format === 'javascript')
    return `const data = ${json};\n\nexport default data;\n`;
  if (format === 'typescript')
    return `type Row = {\n${fields.map((field) => `  ${field}: ${fieldType(field, rows)};`).join('\n')}\n};\n\nconst data: Row[] = ${json};\n\nexport default data;\n`;
  if (format === 'python')
    return `import json\n\ndata = json.loads('''${json.replace(/'/g, "\\'")}''')\n`;
  if (format === 'java')
    return `// Jackson example\nString json = \"\"\"\n${json}\n\"\"\";\nList<Map<String, Object>> data = new ObjectMapper().readValue(json, new TypeReference<>() {});\n`;
  if (format === 'scala')
    return `val data = Seq(\n${rows.map((row) => `  Map(${fields.map((field) => `${JSON.stringify(field)} -> ${JSON.stringify(String(row[field]))}`).join(', ')})`).join(',\n')}\n)\n`;
  if (format === 'spark-scala')
    return `import org.apache.spark.sql.SparkSession\nimport spark.implicits._\n\nval data = Seq(\n${rows.map((row) => `  (${values(row)})`).join(',\n')}\n).toDF(${fieldNames})\n\ndata.show(false)\n`;
  if (format === 'spark-pyspark')
    return `from pyspark.sql import SparkSession\n\nspark = SparkSession.builder.getOrCreate()\ndata = ${json}\ndf = spark.createDataFrame(data)\ndf.show(truncate=False)\n`;
  if (format === 'sql')
    return `CREATE TABLE sample_data (\n${fields.map((field) => `  ${field} ${fieldType(field, rows) === 'number' ? 'DOUBLE' : fieldType(field, rows) === 'boolean' ? 'BOOLEAN' : 'VARCHAR(255)'}`).join(',\n')}\n);\n\n${rows.map((row) => `INSERT INTO sample_data (${fields.join(', ')}) VALUES (${fields.map((field) => (typeof row[field] === 'string' ? `'${String(row[field]).replace(/'/g, "''")}'` : String(row[field]))).join(', ')});`).join('\n')}\n`;
  return json;
}
let parquetReady: Promise<void> | undefined;
const ensureParquet = () => {
  parquetReady ??= initParquet(parquetWasmUrl).then(() => undefined);
  return parquetReady;
};

function listValues(config: string | undefined) {
  return (config || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
function makeValue(field: DataField, index: number): string | number | boolean {
  const { kind, config } = field;
  const first = random(FIRST_NAMES);
  const last = random(LAST_NAMES);
  switch (kind) {
    case 'name':
      return `${first} ${last}`;
    case 'email':
      return `${first}.${last}`.toLowerCase() + '@' + random(DOMAINS);
    case 'phone':
      return `(${Math.floor(200 + Math.random() * 700)}) ${Math.floor(200 + Math.random() * 700)}-${Math.floor(1000 + Math.random() * 9000)}`;
    case 'address':
      return `${Math.floor(100 + Math.random() * 9900)} ${random(STREETS)}, ${random(CITIES)}`;
    case 'number':
      return Number((Math.random() * 1000).toFixed(2));
    case 'lorem':
      return random(LOREM);
    case 'uuid':
      return crypto.randomUUID();
    case 'boolean':
      return Math.random() >= 0.5;
    case 'date':
      return new Date(Date.now() - Math.floor(Math.random() * 365 * 86400000))
        .toISOString()
        .slice(0, 10);
    case 'datetime':
      return new Date(
        Date.now() - Math.floor(Math.random() * 365 * 86400000),
      ).toISOString();
    case 'company':
      return random(COMPANIES);
    case 'url':
      return `https://${first.toLowerCase()}-${last.toLowerCase()}.example.test`;
    case 'color':
      return random(COLORS);
    case 'auto-increment':
      return index + 1;
    case 'number-range': {
      const [minimum = '0', maximum = '100'] = (config || '').split(',');
      const min = Number(minimum.trim());
      const max = Number(maximum.trim());
      if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return 0;
      return Number((min + Math.random() * (max - min)).toFixed(2));
    }
    case 'constant':
      return config?.trim() || 'value';
    case 'list': {
      const values = listValues(config);
      return random(values.length ? values : ['alpha', 'beta', 'gamma']);
    }
    case 'weighted-list': {
      const values = listValues(config)
        .map((entry) => {
          const [value, weight = '1'] = entry.split(':');
          return {
            value: value.trim(),
            weight: Math.max(0, Number(weight.trim()) || 0),
          };
        })
        .filter((entry) => entry.value && entry.weight > 0);
      const total = values.reduce((sum, entry) => sum + entry.weight, 0);
      if (!total) return 'value';
      let target = Math.random() * total;
      for (const entry of values) {
        target -= entry.weight;
        if (target <= 0) return entry.value;
      }
      return values[values.length - 1].value;
    }
  }
}
function generateRows(fields: DataField[], count: number): DataRow[] {
  return Array.from({ length: count }, (_, index) =>
    Object.fromEntries(
      fields.map((field) => [field.name, makeValue(field, index)]),
    ),
  );
}
const isNumericKind = (kind: FieldKind) =>
  kind === 'number' || kind === 'auto-increment' || kind === 'number-range';
function avroSchema(fields: DataField[]) {
  return {
    type: 'record',
    name: 'GeneratedRecord',
    fields: fields.map((field) => ({
      name: field.name,
      type:
        field.kind === 'boolean'
          ? 'boolean'
          : isNumericKind(field.kind)
            ? 'double'
            : 'string',
    })),
  };
}
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
function encodeAvroLong(value: number): number[] {
  let encoded =
    (BigInt(Math.trunc(value)) << 1n) ^ BigInt(Math.trunc(value) >> 31);
  const bytes: number[] = [];
  while (encoded & ~0x7fn) {
    bytes.push(Number((encoded & 0x7fn) | 0x80n));
    encoded >>= 7n;
  }
  bytes.push(Number(encoded));
  return bytes;
}
function decodeAvroLong(bytes: Uint8Array, offset: number): [number, number] {
  let result = 0n;
  let shift = 0n;
  let cursor = offset;
  while (cursor < bytes.length) {
    const byte = bytes[cursor++];
    result |= BigInt(byte & 0x7f) << shift;
    if (!(byte & 0x80))
      return [Number((result >> 1n) ^ -(result & 1n)), cursor];
    shift += 7n;
  }
  throw new Error('Unexpected end of Avro integer.');
}
function encodeAvroString(value: string): number[] {
  const bytes = textEncoder.encode(value);
  return [...encodeAvroLong(bytes.length), ...bytes];
}
function decodeAvroString(bytes: Uint8Array, offset: number): [string, number] {
  const [length, cursor] = decodeAvroLong(bytes, offset);
  if (length < 0 || cursor + length > bytes.length)
    throw new Error('Invalid Avro string length.');
  return [
    textDecoder.decode(bytes.slice(cursor, cursor + length)),
    cursor + length,
  ];
}
function encodeAvroRecord(row: DataRow, fields: DataField[]): number[] {
  const output: number[] = [];
  for (const field of fields) {
    const value = row[field.name];
    if (field.kind === 'boolean') output.push(value ? 1 : 0);
    else if (isNumericKind(field.kind)) {
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setFloat64(0, Number(value), true);
      output.push(...new Uint8Array(buffer));
    } else output.push(...encodeAvroString(String(value)));
  }
  return output;
}
async function encodeAvro(rows: DataRow[], fields: DataField[]): Promise<Blob> {
  const schema = JSON.stringify(avroSchema(fields));
  const sync = crypto.getRandomValues(new Uint8Array(16));
  const header = [
    ...textEncoder.encode('Obj\u0001'),
    ...encodeAvroLong(2),
    ...encodeAvroString('avro.schema'),
    ...encodeAvroString(schema),
    ...encodeAvroString('avro.codec'),
    ...encodeAvroString('null'),
    ...encodeAvroLong(0),
    ...sync,
  ];
  const records = rows.flatMap((row) => encodeAvroRecord(row, fields));
  const block = rows.length
    ? [
        ...encodeAvroLong(rows.length),
        ...encodeAvroLong(records.length),
        ...records,
        ...sync,
      ]
    : [];
  return new Blob([new Uint8Array([...header, ...block])], {
    type: 'application/avro',
  });
}
async function inflateAvroBlock(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined')
    throw new Error('Deflate-compressed Avro files require a newer browser.');

  try {
    const compressed = new Uint8Array(bytes);
    const stream = new Blob([compressed.buffer])
      .stream()
      .pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    throw new Error('This deflate-compressed Avro block is invalid.');
  }
}
async function decodeAvro(file: File): Promise<DataRow[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (textDecoder.decode(bytes.slice(0, 4)) !== 'Obj\u0001')
    throw new Error('This is not an Avro object container file.');
  let cursor = 4;
  const [entryCount, afterCount] = decodeAvroLong(bytes, cursor);
  cursor = afterCount;
  let schemaText = '';
  let codec = 'null';
  for (let index = 0; index < entryCount; index++) {
    const [key, afterKey] = decodeAvroString(bytes, cursor);
    const [value, afterValue] = decodeAvroString(bytes, afterKey);
    cursor = afterValue;
    if (key === 'avro.schema') schemaText = value;
    if (key === 'avro.codec') codec = value;
  }
  const [, afterMap] = decodeAvroLong(bytes, cursor);
  cursor = afterMap;
  if (!['null', 'deflate'].includes(codec))
    throw new Error(
      `Avro codec “${codec}” is not supported by the local reader.`,
    );
  const schema = JSON.parse(schemaText) as {
    fields?: { name: string; type: string }[];
  };
  if (
    !schema.fields?.every((field) =>
      ['string', 'boolean', 'double', 'float', 'int', 'long'].includes(
        field.type,
      ),
    )
  )
    throw new Error('Only flat primitive Avro records are supported.');
  const sync = bytes.slice(cursor, cursor + 16);
  cursor += 16;
  const rows: DataRow[] = [];
  while (cursor < bytes.length && rows.length < MAX_ROWS) {
    const [count, afterBlockCount] = decodeAvroLong(bytes, cursor);
    cursor = afterBlockCount;
    if (!count) break;
    const [blockSize, afterSize] = decodeAvroLong(bytes, cursor);
    cursor = afterSize;
    const end = cursor + blockSize;
    if (end > bytes.length) throw new Error('Invalid Avro block size.');
    const block =
      codec === 'deflate'
        ? await inflateAvroBlock(bytes.slice(cursor, end))
        : bytes.slice(cursor, end);
    let blockCursor = 0;
    for (
      let rowIndex = 0;
      rowIndex < count && blockCursor < block.length && rows.length < MAX_ROWS;
      rowIndex++
    ) {
      const row: DataRow = {};
      for (const field of schema.fields) {
        if (field.type === 'boolean')
          row[field.name] = block[blockCursor++] === 1;
        else if (field.type === 'double') {
          row[field.name] = new DataView(
            block.buffer,
            block.byteOffset + blockCursor,
            8,
          ).getFloat64(0, true);
          blockCursor += 8;
        } else if (field.type === 'float') {
          row[field.name] = new DataView(
            block.buffer,
            block.byteOffset + blockCursor,
            4,
          ).getFloat32(0, true);
          blockCursor += 4;
        } else if (field.type === 'int' || field.type === 'long') {
          const [value, next] = decodeAvroLong(block, blockCursor);
          row[field.name] = value;
          blockCursor = next;
        } else {
          const [value, next] = decodeAvroString(block, blockCursor);
          row[field.name] = value;
          blockCursor = next;
        }
      }
      rows.push(row);
    }
    if (blockCursor !== block.length && rows.length < MAX_ROWS)
      throw new Error('Avro block does not match its schema.');
    cursor = end;
    if (
      bytes
        .slice(cursor, cursor + 16)
        .some((byte, index) => byte !== sync[index])
    )
      throw new Error('Invalid Avro block marker.');
    cursor += 16;
  }
  return rows;
}
async function encodeParquet(
  rows: DataRow[],
  fields: DataField[],
): Promise<Blob> {
  await ensureParquet();
  const columns = Object.fromEntries(
    fields.map((field) => [field.name, rows.map((row) => row[field.name])]),
  ) as Record<string, (string | number | boolean)[]>;
  const wasmTable = ParquetTable.fromIPCStream(
    tableToIPC(tableFromArrays(columns), 'stream'),
  );
  try {
    const bytes = writeParquet(wasmTable);
    return new Blob(
      [
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
      ],
      { type: 'application/vnd.apache.parquet' },
    );
  } finally {
    wasmTable.free();
  }
}
async function decodeParquet(file: File): Promise<DataRow[]> {
  await ensureParquet();
  const wasmTable = readParquet(new Uint8Array(await file.arrayBuffer()), {
    limit: MAX_ROWS,
  });
  try {
    const table = tableFromIPC(wasmTable.intoIPCStream());
    return Array.from(table).map((row) =>
      Object.fromEntries(
        table.schema.fields.map((field) => [
          field.name,
          (row as Record<string, unknown>)[field.name] as
            | string
            | number
            | boolean,
        ]),
      ),
    );
  } finally {
    wasmTable.free();
  }
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const DummyDataGenerator: React.FC = () => {
  const [mode, setMode] = useState<'generate' | 'read'>('generate');
  const [fields, setFields] = useState<DataField[]>(
    STARTER_SCHEMAS[3].fields.map((field) => ({ ...field, id: fieldId() })),
  );
  const [count, setCount] = useState(25);
  const [starterSchema, setStarterSchema] = useState(STARTER_SCHEMAS[3].label);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [rows, setRows] = useState<DataRow[]>([]);
  const [page, setPage] = useState(0);
  const [previewTab, setPreviewTab] = useState<'data' | 'export'>('data');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedData | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRows = mode === 'generate' ? rows : loaded?.rows || [];
  const activeFields =
    mode === 'generate'
      ? fields.map((field) => field.name)
      : loaded?.fields || [];
  const pageRows = activeRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const validSchema =
    fields.length > 0 &&
    fields.every((field) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(field.name)) &&
    new Set(fields.map((field) => field.name)).size === fields.length;
  const applyStarter = (starter: (typeof STARTER_SCHEMAS)[number]) => {
    const starterFields = starter.fields.map((field) => ({
      ...field,
      id: fieldId(),
    }));
    setFields(starterFields);
    setCount(25);
    setRows(generateRows(starterFields, 25));
    setPage(0);
    setPreviewTab('data');
    setError(null);
    setStarterSchema(starter.label);
  };
  const updateField = (id: string, patch: Partial<DataField>) =>
    setFields((current) =>
      current.map((field) =>
        field.id === id ? { ...field, ...patch } : field,
      ),
    );
  const moveField = (index: number, direction: -1 | 1) =>
    setFields((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const generate = () => {
    if (!validSchema) {
      setError(
        'Each field needs a unique name using letters, numbers, and underscores, beginning with a letter or underscore.',
      );
      return;
    }
    setRows(generateRows(fields, Math.max(1, Math.min(MAX_ROWS, count))));
    setPage(0);
    setError(null);
  };
  const outputText = useMemo(
    () =>
      format === 'csv'
        ? serializeCsv(activeRows, activeFields)
        : format === 'ndjson'
          ? serializeNdjson(activeRows)
          : codeFormats.includes(format)
            ? serializeCode(activeRows, activeFields, format)
            : serializeJson(activeRows),
    [activeFields, activeRows, format],
  );
  const exportRows = async (target: ExportFormat) => {
    if (!activeRows.length) return;
    setBusy(true);
    setError(null);
    try {
      const base =
        mode === 'read'
          ? loaded?.name.replace(/\.[^.]+$/, '') || 'dataset'
          : 'generated-data';
      if (codeFormats.includes(target)) {
        const extension =
          target === 'javascript'
            ? 'js'
            : target === 'typescript'
              ? 'ts'
              : target === 'python' || target === 'spark-pyspark'
                ? 'py'
                : target === 'sql'
                  ? 'sql'
                  : target === 'java'
                    ? 'java'
                    : 'scala';
        download(
          new Blob([serializeCode(activeRows, activeFields, target)], {
            type: 'text/plain',
          }),
          `${base}.${extension}`,
        );
      } else if (target === 'csv')
        download(
          new Blob([serializeCsv(activeRows, activeFields)], {
            type: 'text/csv',
          }),
          `${base}.csv`,
        );
      else if (target === 'json')
        download(
          new Blob([serializeJson(activeRows)], { type: 'application/json' }),
          `${base}.json`,
        );
      else if (target === 'ndjson')
        download(
          new Blob([serializeNdjson(activeRows)], {
            type: 'application/x-ndjson',
          }),
          `${base}.ndjson`,
        );
      else if (target === 'avro')
        download(await encodeAvro(activeRows, fields), `${base}.avro`);
      else download(await encodeParquet(activeRows, fields), `${base}.parquet`);
    } catch (cause) {
      setError(
        `Unable to create ${target.toUpperCase()}: ${cause instanceof Error ? cause.message : 'unknown codec error'}`,
      );
    } finally {
      setBusy(false);
    }
  };
  const openFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError(
        'Files larger than 50 MB are not opened to protect browser memory.',
      );
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.avro') && !lower.endsWith('.parquet')) {
      setError('Choose an .avro or .parquet file.');
      return;
    }
    setBusy(true);
    try {
      const decoded = lower.endsWith('.avro')
        ? await decodeAvro(file)
        : await decodeParquet(file);
      const safeRows = decoded.slice(0, MAX_ROWS);
      setLoaded({
        name: file.name,
        format: lower.endsWith('.avro') ? 'Avro' : 'Parquet',
        rows: safeRows,
        fields: safeRows.length ? Object.keys(safeRows[0]) : [],
        size: file.size,
      });
      setPage(0);
      if (decoded.length > MAX_ROWS)
        setError('Only the first 10,000 rows can be previewed.');
    } catch (cause) {
      setLoaded(null);
      setError(
        `Unable to read this file: ${cause instanceof Error ? cause.message : 'unsupported or malformed data'}`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="tool-container dummy-data-tool data-workspace">
      <header className="data-workspace-header">
        <div>
          <span className="tool-eyebrow">Local dataset workspace</span>
          <h2>Data</h2>
          <p>
            Create flat test records or inspect Avro and Parquet files without
            uploading them.
          </p>
        </div>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${mode === 'generate' ? 'active' : ''}`}
            onClick={() => {
              setMode('generate');
              setPage(0);
            }}
          >
            Generate
          </button>
          <button
            className={`toggle-btn ${mode === 'read' ? 'active' : ''}`}
            onClick={() => {
              setMode('read');
              setPage(0);
            }}
          >
            Read files
          </button>
        </div>
      </header>
      {error && (
        <p className="error-msg" role="alert">
          {error}
        </p>
      )}
      {mode === 'generate' ? (
        <section className="section data-schema-section">
          <div className="data-section-header data-schema-picker">
            <div>
              <span className="label">Starter schema</span>
              <p>Load a useful field set, then tailor it below.</p>
            </div>
            <select
              className="input"
              aria-label="Starter schema"
              value={starterSchema}
              onChange={(event) => {
                const starter = STARTER_SCHEMAS.find(
                  (item) => item.label === event.target.value,
                );
                if (starter) applyStarter(starter);
              }}
            >
              <option value="" disabled>
                Select a starter schema
              </option>
              {STARTER_SCHEMAS.map((starter) => (
                <option key={starter.label} value={starter.label}>
                  {starter.label}
                </option>
              ))}
            </select>
          </div>
          <div className="data-fields" aria-label="Dataset fields">
            {fields.map((field, index) => (
              <div className="data-field-row" key={field.id}>
                <span className="data-field-index" aria-hidden="true">
                  {index + 1}
                </span>
                <select
                  className="input"
                  aria-label={`${field.name || 'Field'} generator`}
                  value={field.kind}
                  onChange={(event) =>
                    updateField(field.id, {
                      kind: event.target.value as FieldKind,
                    })
                  }
                >
                  {FIELD_OPTIONS.map((option) => (
                    <option value={option.kind} key={option.kind}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  aria-label={`Field ${index + 1} name`}
                  value={field.name}
                  onChange={(event) =>
                    updateField(field.id, {
                      name: cleanName(event.target.value),
                    })
                  }
                />
                <div
                  className={`data-field-option${FIELD_CONFIG[field.kind] ? '' : ' is-empty'}`}
                >
                  {FIELD_CONFIG[field.kind] && (
                    <input
                      className="input"
                      aria-label={`${field.name || 'Field'} ${FIELD_CONFIG[field.kind]!.hint.toLowerCase()}`}
                      placeholder={FIELD_CONFIG[field.kind]!.placeholder}
                      value={field.config || ''}
                      onChange={(event) =>
                        updateField(field.id, { config: event.target.value })
                      }
                    />
                  )}
                </div>
                <div className="data-field-actions">
                  <button
                    className="btn btn-sm"
                    aria-label={`Move ${field.name} up`}
                    onClick={() => moveField(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-sm"
                    aria-label={`Move ${field.name} down`}
                    onClick={() => moveField(index, 1)}
                    disabled={index === fields.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    aria-label={`Remove ${field.name}`}
                    onClick={() =>
                      setFields((current) =>
                        current.filter((item) => item.id !== field.id),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn"
            onClick={() =>
              setFields((current) => [
                ...current,
                {
                  id: fieldId(),
                  name: `field_${current.length + 1}`,
                  kind: 'lorem',
                  config: '',
                },
              ])
            }
          >
            + Add field
          </button>
          <div className="data-generate-actions">
            <label>
              <span className="label">Rows (1–10,000)</span>
              <input
                className="input data-count-input"
                type="number"
                min={1}
                max={MAX_ROWS}
                value={count}
                onChange={(event) =>
                  setCount(
                    Math.max(
                      1,
                      Math.min(MAX_ROWS, Number(event.target.value) || 1),
                    ),
                  )
                }
              />
            </label>
            <div className="dummy-presets">
              {[25, 100, 1000, 10000].map((preset) => (
                <button
                  className={`btn btn-sm ${count === preset ? 'btn-primary' : ''}`}
                  onClick={() => setCount(preset)}
                  key={preset}
                >
                  {preset}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={generate}>
              Generate {count.toLocaleString()} rows
            </button>
          </div>
        </section>
      ) : (
        <section className="section data-reader-section">
          <input
            ref={fileInputRef}
            className="data-file-input"
            type="file"
            accept=".avro,.parquet,application/octet-stream"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void openFile(file);
              event.currentTarget.value = '';
            }}
          />
          <button
            className="data-drop-zone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) void openFile(file);
            }}
          >
            <strong>Open Avro or Parquet</strong>
            <span>
              Drop a file here or choose from your device · 50 MB maximum
            </span>
          </button>
          {loaded && (
            <div className="data-file-summary">
              <span className="badge">{loaded.format}</span>
              <strong>{loaded.name}</strong>
              <span>
                {loaded.rows.length.toLocaleString()} rows ·{' '}
                {(loaded.size / 1024).toFixed(1)} KB · {loaded.fields.length}{' '}
                fields
              </span>
            </div>
          )}
        </section>
      )}
      <section className={`section data-preview-section ${previewTab}-preview`}>
        <div className="data-section-header">
          <div>
            <span className="label">
              {previewTab === 'export'
                ? 'Export preview'
                : mode === 'read'
                  ? 'Decoded data'
                  : 'Data preview'}
            </span>
            <span className="data-preview-meta">
              {previewTab === 'export'
                ? `${formatLabel(format)} · ${new Blob([outputText]).size.toLocaleString()} B`
                : `${activeRows.length.toLocaleString()} rows · ${activeFields.length} fields`}
            </span>
          </div>
          <div className="data-preview-header-actions">
            <div
              className="toggle-group data-preview-tabs"
              role="tablist"
              aria-label="Data output preview"
            >
              <button
                className={`toggle-btn ${previewTab === 'data' ? 'active' : ''}`}
                role="tab"
                aria-selected={previewTab === 'data'}
                onClick={() => setPreviewTab('data')}
              >
                Data preview
              </button>
              <button
                className={`toggle-btn ${previewTab === 'export' ? 'active' : ''}`}
                role="tab"
                aria-selected={previewTab === 'export'}
                onClick={() => setPreviewTab('export')}
              >
                Export preview
              </button>
            </div>
            <div className="toolbar">
              <label className="data-code-format" htmlFor="data-format">
                <span>Format</span>
                <select
                  id="data-format"
                  className="input"
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value as ExportFormat)
                  }
                >
                  <optgroup label="Data formats">
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="ndjson">NDJSON</option>
                  </optgroup>
                  <optgroup label="Programming languages">
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="scala">Scala</option>
                    <option value="sql">SQL</option>
                  </optgroup>
                  <optgroup label="Apache Spark">
                    <option value="spark-pyspark">PySpark</option>
                    <option value="spark-scala">Spark Scala</option>
                  </optgroup>
                </select>
              </label>
              <button
                className="btn btn-sm"
                disabled={!activeRows.length}
                onClick={() => copyToClipboard(outputText)}
              >
                Copy to clipboard
              </button>
              <button
                className="btn btn-primary btn-sm"
                disabled={!activeRows.length || busy}
                onClick={() => void exportRows(format)}
              >
                ↓ Download
              </button>
            </div>
          </div>
        </div>
        {pageRows.length ? (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {activeFields.map((field) => (
                      <th key={field}>{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, index) => (
                    <tr key={index}>
                      {activeFields.map((field) => (
                        <td key={field}>{String(row[field] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="data-pagination">
              <button
                className="btn btn-sm"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span>
                Rows {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, activeRows.length)} of{' '}
                {activeRows.length.toLocaleString()}
              </span>
              <button
                className="btn btn-sm"
                disabled={(page + 1) * PAGE_SIZE >= activeRows.length}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </footer>
          </>
        ) : (
          <div className="dummy-empty-state">
            {mode === 'read' && error ? (
              <>
                <strong>Couldn’t decode this file</strong>
                <span>Choose another Avro or Parquet file to inspect locally.</span>
              </>
            ) : (
              <span>
                {mode === 'generate'
                  ? 'Configure fields, then generate a local dataset.'
                  : 'Choose an Avro or Parquet file to inspect it locally.'}
              </span>
            )}
          </div>
        )}
        {activeRows.length > 0 && (
          <section className="data-code-output" aria-label="Generated code">
            <div className="data-code-output-header">
              <span className="label">Export output</span>
              <span>
                {formatLabel(format)} ·{' '}
                {new Blob([outputText]).size.toLocaleString()} B
              </span>
            </div>
            <pre className="data-code-preview">{outputText}</pre>
          </section>
        )}
      </section>
    </div>
  );
};
export default DummyDataGenerator;
