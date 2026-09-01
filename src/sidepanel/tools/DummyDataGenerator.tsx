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
type AvroSchema = string | AvroSchemaObject | AvroSchema[];
type AvroSchemaObject = {
  type: string | AvroSchema;
  fields?: { name: string; type: AvroSchema }[];
  items?: AvroSchema;
  values?: AvroSchema;
  symbols?: string[];
  size?: number;
};
type AvroValue =
  | null
  | boolean
  | number
  | string
  | Uint8Array
  | AvroValue[]
  | { [key: string]: AvroValue };
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
const DEFAULT_LIST_CONFIG = 'alpha,beta,gamma';
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
];
const FIELD_CONFIG: Partial<
  Record<FieldKind, { placeholder: string; hint: string }>
> = {
  constant: { placeholder: 'e.g. active', hint: 'Fixed value' },
  list: {
    placeholder: 'e.g. basic,pro,enterprise',
    hint: 'Comma-separated values',
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

type ListValueEditorProps = {
  config?: string;
  label: string;
  onChange: (config: string) => void;
};

const ListValueEditor: React.FC<ListValueEditorProps> = ({
  config,
  label,
  onChange,
}) => {
  const [draft, setDraft] = useState('');
  const values = listValues(config);
  const saveValues = (nextValues: string[]) => onChange(nextValues.join(','));
  const addValues = (value: string) => {
    const nextValues = listValues(value);
    if (nextValues.length) saveValues([...values, ...nextValues]);
    setDraft('');
  };

  return (
    <div className="list-value-editor">
      {values.map((value, index) => (
        <span className="list-value-chip" key={`${value}-${index}`}>
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={() =>
              saveValues(values.filter((_, valueIndex) => valueIndex !== index))
            }
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="list-value-input"
        aria-label={label}
        placeholder={values.length ? 'Add value' : 'Add values'}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addValues(draft);
          }
          if (event.key === 'Backspace' && !draft && values.length) {
            saveValues(values.slice(0, -1));
          }
        }}
        onBlur={() => addValues(draft)}
        onPaste={(event) => {
          const pastedValues = listValues(event.clipboardData.getData('text'));
          if (pastedValues.length > 1) {
            event.preventDefault();
            saveValues([...values, ...pastedValues]);
            setDraft('');
          }
        }}
      />
    </div>
  );
};

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
  const [result, cursor] = decodeAvroLongValue(bytes, offset);
  return [Number(result), cursor];
}
function decodeAvroLongValue(
  bytes: Uint8Array,
  offset: number,
): [bigint, number] {
  let result = 0n;
  let shift = 0n;
  let cursor = offset;
  while (cursor < bytes.length) {
    const byte = bytes[cursor++];
    result |= BigInt(byte & 0x7f) << shift;
    if (!(byte & 0x80))
      return [(result >> 1n) ^ -(result & 1n), cursor];
    shift += 7n;
  }
  throw new Error('Unexpected end of Avro integer.');
}
function decodeAvroBytes(bytes: Uint8Array, offset: number): [Uint8Array, number] {
  const [length, cursor] = decodeAvroLong(bytes, offset);
  if (length < 0 || cursor + length > bytes.length)
    throw new Error('Invalid Avro byte length.');
  return [bytes.slice(cursor, cursor + length), cursor + length];
}
function encodeAvroString(value: string): number[] {
  const bytes = textEncoder.encode(value);
  return [...encodeAvroLong(bytes.length), ...bytes];
}
function decodeAvroString(bytes: Uint8Array, offset: number): [string, number] {
  const [value, cursor] = decodeAvroBytes(bytes, offset);
  return [
    textDecoder.decode(value),
    cursor,
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
type HuffmanTable = Map<string, number>;
const DEFLATE_LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59,
  67, 83, 99, 115, 131, 163, 195, 227, 258,
];
const DEFLATE_LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4,
  5, 5, 5, 5, 0,
];
const DEFLATE_DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513,
  769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DEFLATE_DISTANCE_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10,
  10, 11, 11, 12, 12, 13, 13,
];
function reverseDeflateBits(value: number, length: number): number {
  let reversed = 0;
  for (let index = 0; index < length; index++) {
    reversed = (reversed << 1) | (value & 1);
    value >>>= 1;
  }
  return reversed;
}
function buildHuffmanTable(lengths: number[]): HuffmanTable {
  const counts = Array(16).fill(0) as number[];
  for (const length of lengths) if (length) counts[length]++;
  const nextCode = Array(16).fill(0) as number[];
  let code = 0;
  for (let length = 1; length <= 15; length++) {
    code = (code + counts[length - 1]) << 1;
    nextCode[length] = code;
  }
  const table: HuffmanTable = new Map();
  lengths.forEach((length, symbol) => {
    if (length) {
      const reversed = reverseDeflateBits(nextCode[length]++, length);
      table.set(`${length}:${reversed}`, symbol);
    }
  });
  return table;
}
function inflateAvroBlock(bytes: Uint8Array): Uint8Array {
  let offset = 0;
  let bitOffset = 0;
  const output: number[] = [];
  const readBits = (length: number): number => {
    let value = 0;
    for (let index = 0; index < length; index++) {
      if (offset >= bytes.length) throw new Error('Unexpected end of deflate block.');
      value |= ((bytes[offset] >> bitOffset) & 1) << index;
      if (++bitOffset === 8) {
        bitOffset = 0;
        offset++;
      }
    }
    return value;
  };
  const alignToByte = () => {
    if (bitOffset) {
      bitOffset = 0;
      offset++;
    }
  };
  const readSymbol = (table: HuffmanTable): number => {
    let code = 0;
    for (let length = 1; length <= 15; length++) {
      code |= readBits(1) << (length - 1);
      const symbol = table.get(`${length}:${code}`);
      if (symbol !== undefined) return symbol;
    }
    throw new Error('Invalid deflate Huffman code.');
  };
  const fixedTables = (): [HuffmanTable, HuffmanTable] => [
    buildHuffmanTable(Array.from({ length: 288 }, (_value, index) =>
      index <= 143 ? 8 : index <= 255 ? 9 : index <= 279 ? 7 : 8,
    )),
    buildHuffmanTable(Array(32).fill(5) as number[]),
  ];
  const dynamicTables = (): [HuffmanTable, HuffmanTable] => {
    const literalCount = readBits(5) + 257;
    const distanceCount = readBits(5) + 1;
    const codeLengthCount = readBits(4) + 4;
    const codeLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    const codeLengths = Array(19).fill(0) as number[];
    for (let index = 0; index < codeLengthCount; index++)
      codeLengths[codeLengthOrder[index]] = readBits(3);
    const codeLengthTable = buildHuffmanTable(codeLengths);
    const lengths: number[] = [];
    while (lengths.length < literalCount + distanceCount) {
      const symbol = readSymbol(codeLengthTable);
      if (symbol < 16) lengths.push(symbol);
      else {
        const repeat =
          symbol === 16 ? readBits(2) + 3 : symbol === 17 ? readBits(3) + 3 : readBits(7) + 11;
        const value = symbol === 16 ? lengths[lengths.length - 1] : 0;
        if (value === undefined || lengths.length + repeat > literalCount + distanceCount)
          throw new Error('Invalid deflate code lengths.');
        lengths.push(...Array(repeat).fill(value));
      }
    }
    return [
      buildHuffmanTable(lengths.slice(0, literalCount)),
      buildHuffmanTable(lengths.slice(literalCount)),
    ];
  };
  const decodeCompressedBlock = (literalTable: HuffmanTable, distanceTable: HuffmanTable) => {
    while (true) {
      const symbol = readSymbol(literalTable);
      if (symbol < 256) output.push(symbol);
      else if (symbol === 256) return;
      else if (symbol <= 285) {
        const lengthIndex = symbol - 257;
        const length = DEFLATE_LENGTH_BASE[lengthIndex] + readBits(DEFLATE_LENGTH_EXTRA[lengthIndex]);
        const distanceIndex = readSymbol(distanceTable);
        if (distanceIndex >= DEFLATE_DISTANCE_BASE.length)
          throw new Error('Invalid deflate distance.');
        const distance = DEFLATE_DISTANCE_BASE[distanceIndex] + readBits(DEFLATE_DISTANCE_EXTRA[distanceIndex]);
        if (distance > output.length) throw new Error('Invalid deflate back-reference.');
        for (let index = 0; index < length; index++) output.push(output[output.length - distance]);
      } else throw new Error('Invalid deflate length.');
    }
  };
  try {
    let finalBlock = 0;
    while (!finalBlock) {
      finalBlock = readBits(1);
      const type = readBits(2);
      if (type === 0) {
        alignToByte();
        const length = readBits(16);
        if (length !== (readBits(16) ^ 0xffff)) throw new Error('Invalid stored deflate block.');
        for (let index = 0; index < length; index++) output.push(readBits(8));
      } else if (type === 1) decodeCompressedBlock(...fixedTables());
      else if (type === 2) decodeCompressedBlock(...dynamicTables());
      else throw new Error('Invalid deflate block type.');
    }
    return new Uint8Array(output);
  } catch {
    throw new Error('This deflate-compressed Avro block is invalid.');
  }
}
function avroType(schema: AvroSchema): AvroSchema {
  return typeof schema === 'string' || Array.isArray(schema)
    ? schema
    : schema.type;
}
function decodeAvroValue(
  bytes: Uint8Array,
  offset: number,
  schema: AvroSchema,
): [AvroValue, number] {
  if (Array.isArray(schema)) {
    const [branch, cursor] = decodeAvroLong(bytes, offset);
    if (branch < 0 || branch >= schema.length)
      throw new Error('Invalid Avro union branch.');
    return decodeAvroValue(bytes, cursor, schema[branch]);
  }
  const type = avroType(schema);
  if (Array.isArray(type)) return decodeAvroValue(bytes, offset, type);
  if (typeof type !== 'string') return decodeAvroValue(bytes, offset, type);
  if (type === 'null') return [null, offset];
  if (type === 'boolean') {
    if (offset >= bytes.length) throw new Error('Unexpected end of Avro boolean.');
    return [bytes[offset] === 1, offset + 1];
  }
  if (type === 'int' || type === 'long') {
    const [value, cursor] = decodeAvroLongValue(bytes, offset);
    return [
      value > BigInt(Number.MAX_SAFE_INTEGER) ||
      value < BigInt(Number.MIN_SAFE_INTEGER)
        ? value.toString()
        : Number(value),
      cursor,
    ];
  }
  if (type === 'float' || type === 'double') {
    const width = type === 'float' ? 4 : 8;
    if (offset + width > bytes.length)
      throw new Error(`Unexpected end of Avro ${type}.`);
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, width);
    return [
      type === 'float' ? view.getFloat32(0, true) : view.getFloat64(0, true),
      offset + width,
    ];
  }
  if (type === 'string') return decodeAvroString(bytes, offset);
  if (type === 'bytes') return decodeAvroBytes(bytes, offset);
  if (typeof schema === 'string')
    throw new Error(`Avro type “${type}” is not supported by the local reader.`);
  if (type === 'fixed') {
    if (!schema.size || offset + schema.size > bytes.length)
      throw new Error('Invalid Avro fixed value.');
    return [bytes.slice(offset, offset + schema.size), offset + schema.size];
  }
  if (type === 'enum') {
    const [index, cursor] = decodeAvroLong(bytes, offset);
    if (!schema.symbols || index < 0 || index >= schema.symbols.length)
      throw new Error('Invalid Avro enum value.');
    return [schema.symbols[index], cursor];
  }
  if (type === 'record') {
    if (!schema.fields) throw new Error('Invalid Avro record schema.');
    const value: { [key: string]: AvroValue } = {};
    let cursor = offset;
    for (const field of schema.fields) {
      [value[field.name], cursor] = decodeAvroValue(bytes, cursor, field.type);
    }
    return [value, cursor];
  }
  if (type === 'array') {
    if (!schema.items) throw new Error('Invalid Avro array schema.');
    const value: AvroValue[] = [];
    let cursor = offset;
    let count = 0;
    do {
      [count, cursor] = decodeAvroLong(bytes, cursor);
      if (count < 0) {
        count = -count;
        [, cursor] = decodeAvroLong(bytes, cursor);
      }
      for (let index = 0; index < count; index++) {
        [value[value.length], cursor] = decodeAvroValue(bytes, cursor, schema.items);
      }
    } while (count);
    return [value, cursor];
  }
  if (type === 'map') {
    if (!schema.values) throw new Error('Invalid Avro map schema.');
    const value: { [key: string]: AvroValue } = {};
    let cursor = offset;
    let count = 0;
    do {
      [count, cursor] = decodeAvroLong(bytes, cursor);
      if (count < 0) {
        count = -count;
        [, cursor] = decodeAvroLong(bytes, cursor);
      }
      for (let index = 0; index < count; index++) {
        const [key, afterKey] = decodeAvroString(bytes, cursor);
        [value[key], cursor] = decodeAvroValue(bytes, afterKey, schema.values);
      }
    } while (count);
    return [value, cursor];
  }
  throw new Error(`Avro type “${type}” is not supported by the local reader.`);
}
function displayAvroValue(value: AvroValue): string | number | boolean {
  if (value === null) return '';
  if (value instanceof Uint8Array)
    return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  return JSON.stringify(value, (_key, nestedValue) =>
    nestedValue instanceof Uint8Array
      ? Array.from(nestedValue, (byte) => byte.toString(16).padStart(2, '0')).join('')
      : nestedValue,
  );
}
function displayAvroRecord(value: AvroValue): DataRow {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Uint8Array)
    throw new Error('The Avro root schema must be a record.');
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [key, displayAvroValue(field)]),
  );
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
  const schema = JSON.parse(schemaText) as AvroSchema;
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
      const [value, cursor] = decodeAvroValue(block, blockCursor, schema);
      rows.push(displayAvroRecord(value));
      blockCursor = cursor;
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

interface DataWorkspaceProps {
  initialInput?: string;
  variant?: 'generate' | 'read';
}

export const DummyDataGenerator: React.FC<DataWorkspaceProps> = ({
  variant = 'generate',
}) => {
  const isReader = variant === 'read';
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
  const activeRows = isReader ? loaded?.rows || [] : rows;
  const activeFields =
    isReader ? loaded?.fields || [] : fields.map((field) => field.name);
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
  const updateGeneratedField = (id: string, patch: Partial<DataField>) => {
    const nextFields = fields.map((field) =>
      field.id === id ? { ...field, ...patch } : field,
    );
    setFields(nextFields);
    setRows(generateRows(nextFields, Math.max(1, Math.min(MAX_ROWS, count))));
    setPage(0);
    setPreviewTab('data');
    setError(null);
  };
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
        isReader
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
          <h2>{isReader ? 'Read files' : 'Data'}</h2>
          <p>
            {isReader
              ? 'Inspect Avro and Parquet files without uploading them.'
              : 'Create flat test records without uploading them.'}
          </p>
        </div>
      </header>
      {error && (
        <p className="error-msg" role="alert">
          {error}
        </p>
      )}
      {!isReader ? (
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
                  onChange={(event) => {
                    const kind = event.target.value as FieldKind;
                    if (kind === 'list') {
                      updateGeneratedField(field.id, {
                        kind,
                        config: DEFAULT_LIST_CONFIG,
                      });
                      return;
                    }
                    updateField(field.id, { kind });
                  }}
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
                  {field.kind === 'list' ? (
                    <ListValueEditor
                      config={field.config}
                      label={`${field.name || 'Field'} comma-separated values`}
                      onChange={(config) =>
                        updateGeneratedField(field.id, { config })
                      }
                    />
                  ) : FIELD_CONFIG[field.kind] ? (
                    <input
                      className="input"
                      aria-label={`${field.name || 'Field'} ${FIELD_CONFIG[field.kind]!.hint.toLowerCase()}`}
                      placeholder={FIELD_CONFIG[field.kind]!.placeholder}
                      value={field.config || ''}
                      onChange={(event) =>
                        updateField(field.id, { config: event.target.value })
                      }
                    />
                  ) : null}
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
                : isReader
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
            {isReader && error ? (
              <>
                <strong>Couldn’t decode this file</strong>
                <span>Choose another Avro or Parquet file to inspect locally.</span>
              </>
            ) : (
              <span>
                {isReader
                  ? 'Choose an Avro or Parquet file to inspect it locally.'
                  : 'Configure fields, then generate a local dataset.'}
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

export const DataFileReader: React.FC<DataWorkspaceProps> = () => (
  <DummyDataGenerator variant="read" />
);

export default DummyDataGenerator;
