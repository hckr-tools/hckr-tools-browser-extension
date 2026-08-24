import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import './DummyDataGenerator.css';

interface DummyDataGeneratorProps {
  initialInput?: string;
}

type DataType = 'lorem' | 'names' | 'emails' | 'phones' | 'addresses' | 'numbers';
type LoremSubtype = 'words' | 'sentences' | 'paragraphs';
type NameSubtype = 'full' | 'first' | 'last';
type PhoneFormat = 'us' | 'international' | 'dashed' | 'digits';
type AddressSubtype = 'full' | 'street' | 'city-state-zip';
type NumberType = 'integer' | 'decimal';

// --- Data Pools ---
const LOREM_WORDS = [
  'ad', 'adipiscing', 'aliqua', 'aliquip', 'amet', 'anim', 'aute', 'cillum',
  'commodo', 'consectetur', 'consequat', 'culpa', 'cupidatat', 'deserunt', 'do',
  'dolor', 'dolore', 'duis', 'ea', 'eiusmod', 'elit', 'enim', 'esse',
  'est', 'et', 'eu', 'ex', 'excepteur', 'exercitation', 'fugiat', 'id',
  'in', 'incididunt', 'ipsum', 'irure', 'labore', 'laboris', 'laborum', 'lorem',
  'magna', 'minim', 'mollit', 'nisi', 'non', 'nostrud', 'nulla', 'occaecat',
  'officia', 'pariatur', 'proident', 'qui', 'quis', 'reprehenderit', 'sed', 'sint',
  'sit', 'sunt', 'tempor', 'ullamco', 'ut', 'velit', 'veniam', 'voluptate'
];

const FIRST_NAMES = [
  'Alexander', 'Amelia', 'Benjamin', 'Charlotte', 'Daniel', 'Eleanor', 'Ethan',
  'Emma', 'Gabriel', 'Grace', 'Henry', 'Hannah', 'Isaac', 'Isabella',
  'Jack', 'Julia', 'Liam', 'Lucas', 'Maya', 'Mason', 'Noah', 'Nora',
  'Oliver', 'Olivia', 'Peter', 'Penelope', 'Quinn', 'Rachel', 'Samuel',
  'Sophia', 'Thomas', 'Victoria', 'William', 'Zoe', 'Adrian', 'Clara',
  'Julian', 'Elena', 'Marcus', 'Stella', 'Leo', 'Ava', 'Nathan', 'Chloe'
];

const LAST_NAMES = [
  'Anderson', 'Baker', 'Carter', 'Davis', 'Evans', 'Foster', 'Garcia',
  'Harris', 'Jackson', 'Johnson', 'Kim', 'Lee', 'Martin', 'Miller',
  'Nelson', "O'Connor", 'Patel', 'Parker', 'Quinn', 'Reed', 'Roberts',
  'Smith', 'Taylor', 'Thomas', 'Turner', 'Walker', 'White', 'Williams',
  'Wilson', 'Wright', 'Young', 'Zhang', 'Brooks', 'Cooper', 'Morgan',
  'Murphy', 'Price', 'Ross', 'Sanders', 'Wood'
];

const DOMAINS = [
  'example.com', 'mail.com', 'test.org', 'devmail.io', 'domain.net',
  'company.co', 'inbox.dev', 'techcorp.io', 'webmail.app', 'cloudnet.org',
  'sample.co', 'fastmail.dev', 'appdev.net', 'coderhub.org'
];

const STREET_NAMES = [
  'Maple', 'Oak', 'Pine', 'Cedar', 'Elm', 'Washington', 'Lake', 'Hill',
  'Park', 'Main', 'Market', 'Chestnut', 'Walnut', 'Highland', 'Sunset',
  'Spring', 'Willow', 'Lincoln', 'Madison', 'Jackson', 'River', 'Forest',
  'Valley', 'Meadow', 'Broad', 'Church', 'Center', 'North', 'Ridge', 'Beacon'
];

const STREET_SUFFIXES = ['St', 'Ave', 'Blvd', 'Rd', 'Dr', 'Ln', 'Way', 'Ct', 'Pl', 'Terrace'];

const CITIES_AND_STATES = [
  { city: 'New York', state: 'NY', zipPrefix: '100' },
  { city: 'Los Angeles', state: 'CA', zipPrefix: '900' },
  { city: 'Chicago', state: 'IL', zipPrefix: '606' },
  { city: 'Houston', state: 'TX', zipPrefix: '770' },
  { city: 'Phoenix', state: 'AZ', zipPrefix: '850' },
  { city: 'Philadelphia', state: 'PA', zipPrefix: '191' },
  { city: 'San Antonio', state: 'TX', zipPrefix: '782' },
  { city: 'San Diego', state: 'CA', zipPrefix: '921' },
  { city: 'Dallas', state: 'TX', zipPrefix: '752' },
  { city: 'Austin', state: 'TX', zipPrefix: '787' },
  { city: 'San Jose', state: 'CA', zipPrefix: '951' },
  { city: 'Seattle', state: 'WA', zipPrefix: '981' },
  { city: 'Denver', state: 'CO', zipPrefix: '802' },
  { city: 'Boston', state: 'MA', zipPrefix: '021' },
  { city: 'Portland', state: 'OR', zipPrefix: '972' },
  { city: 'Atlanta', state: 'GA', zipPrefix: '303' },
  { city: 'Miami', state: 'FL', zipPrefix: '331' },
  { city: 'San Francisco', state: 'CA', zipPrefix: '941' },
  { city: 'Nashville', state: 'TN', zipPrefix: '372' },
  { city: 'Minneapolis', state: 'MN', zipPrefix: '554' }
];

const AREA_CODES = ['212', '310', '415', '617', '312', '702', '512', '206', '303', '404', '718', '650'];

// --- Helper Functions ---
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateLoremSentence(startWithLorem = false): string {
  const wordCount = getRandomInt(7, 14);
  const words: string[] = [];

  if (startWithLorem) {
    words.push('Lorem', 'ipsum', 'dolor', 'sit', 'amet');
    while (words.length < wordCount) {
      words.push(getRandomItem(LOREM_WORDS));
    }
  } else {
    for (let i = 0; i < wordCount; i++) {
      words.push(getRandomItem(LOREM_WORDS));
    }
    words[0] = capitalize(words[0]);
  }

  // Insert a comma in the middle occasionally for realism
  if (words.length > 8 && Math.random() > 0.4) {
    const commaPos = getRandomInt(3, words.length - 4);
    words[commaPos] = words[commaPos] + ',';
  }

  return words.join(' ') + '.';
}

function generateLoremParagraph(isFirstParagraph = false): string {
  const sentenceCount = getRandomInt(3, 6);
  const sentences: string[] = [];

  for (let i = 0; i < sentenceCount; i++) {
    const isStart = isFirstParagraph && i === 0;
    sentences.push(generateLoremSentence(isStart));
  }

  return sentences.join(' ');
}

export const DummyDataGenerator: React.FC<DummyDataGeneratorProps> = () => {
  // Config state
  const [dataType, setDataType] = useState<DataType>('lorem');
  const [count, setCount] = useState<number>(5);

  // Subtype configs
  const [loremSubtype, setLoremSubtype] = useState<LoremSubtype>('paragraphs');
  const [startWithLorem, setStartWithLorem] = useState<boolean>(true);
  const [nameSubtype, setNameSubtype] = useState<NameSubtype>('full');
  const [phoneFormat, setPhoneFormat] = useState<PhoneFormat>('us');
  const [addressSubtype, setAddressSubtype] = useState<AddressSubtype>('full');
  const [numberType, setNumberType] = useState<NumberType>('integer');
  const [numMin, setNumMin] = useState<number>(1);
  const [numMax, setNumMax] = useState<number>(100);
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2);

  // Output items state
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Generate data handler
  const handleGenerate = useCallback(() => {
    const safeCount = Math.max(1, Math.min(100, count || 1));
    const items: string[] = [];

    switch (dataType) {
      case 'lorem': {
        if (loremSubtype === 'words') {
          for (let i = 0; i < safeCount; i++) {
            items.push(getRandomItem(LOREM_WORDS));
          }
        } else if (loremSubtype === 'sentences') {
          for (let i = 0; i < safeCount; i++) {
            items.push(generateLoremSentence(startWithLorem && i === 0));
          }
        } else {
          for (let i = 0; i < safeCount; i++) {
            items.push(generateLoremParagraph(startWithLorem && i === 0));
          }
        }
        break;
      }
      case 'names': {
        for (let i = 0; i < safeCount; i++) {
          const first = getRandomItem(FIRST_NAMES);
          const last = getRandomItem(LAST_NAMES);
          if (nameSubtype === 'first') {
            items.push(first);
          } else if (nameSubtype === 'last') {
            items.push(last);
          } else {
            items.push(`${first} ${last}`);
          }
        }
        break;
      }
      case 'emails': {
        for (let i = 0; i < safeCount; i++) {
          const first = getRandomItem(FIRST_NAMES).toLowerCase();
          const last = getRandomItem(LAST_NAMES).toLowerCase().replace(/['\s]/g, '');
          const domain = getRandomItem(DOMAINS);
          const pattern = getRandomInt(1, 4);

          let username = '';
          if (pattern === 1) {
            username = `${first}.${last}`;
          } else if (pattern === 2) {
            username = `${first[0]}${last}`;
          } else if (pattern === 3) {
            username = `${first}_${last}${getRandomInt(10, 99)}`;
          } else {
            username = `${first}${getRandomInt(100, 999)}`;
          }

          items.push(`${username}@${domain}`);
        }
        break;
      }
      case 'phones': {
        for (let i = 0; i < safeCount; i++) {
          const area = getRandomItem(AREA_CODES);
          const prefix = String(getRandomInt(200, 999));
          const line = String(getRandomInt(1000, 9999));

          if (phoneFormat === 'us') {
            items.push(`(${area}) ${prefix}-${line}`);
          } else if (phoneFormat === 'international') {
            items.push(`+1 (${area}) ${prefix}-${line}`);
          } else if (phoneFormat === 'dashed') {
            items.push(`${area}-${prefix}-${line}`);
          } else {
            items.push(`+1${area}${prefix}${line}`);
          }
        }
        break;
      }
      case 'addresses': {
        for (let i = 0; i < safeCount; i++) {
          const streetNum = getRandomInt(100, 9999);
          const streetName = getRandomItem(STREET_NAMES);
          const streetSuffix = getRandomItem(STREET_SUFFIXES);
          const location = getRandomItem(CITIES_AND_STATES);
          const zipLast = String(getRandomInt(10, 99));
          const zip = `${location.zipPrefix}${zipLast}`;

          if (addressSubtype === 'street') {
            items.push(`${streetNum} ${streetName} ${streetSuffix}`);
          } else if (addressSubtype === 'city-state-zip') {
            items.push(`${location.city}, ${location.state} ${zip}`);
          } else {
            items.push(`${streetNum} ${streetName} ${streetSuffix}, ${location.city}, ${location.state} ${zip}`);
          }
        }
        break;
      }
      case 'numbers': {
        const minVal = Math.min(numMin, numMax);
        const maxVal = Math.max(numMin, numMax);
        for (let i = 0; i < safeCount; i++) {
          if (numberType === 'integer') {
            items.push(String(getRandomInt(minVal, maxVal)));
          } else {
            const rawVal = Math.random() * (maxVal - minVal) + minVal;
            items.push(rawVal.toFixed(decimalPlaces));
          }
        }
        break;
      }
    }

    setGeneratedItems(items);
  }, [
    dataType,
    count,
    loremSubtype,
    startWithLorem,
    nameSubtype,
    phoneFormat,
    addressSubtype,
    numberType,
    numMin,
    numMax,
    decimalPlaces,
  ]);

  // Initial generation on mount
  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Copy all handler
  const handleCopyAll = useCallback(() => {
    if (generatedItems.length === 0) return;
    const delimiter = dataType === 'lorem' && loremSubtype === 'paragraphs' ? '\n\n' : '\n';
    const textToCopy = generatedItems.join(delimiter);
    copyToClipboard(textToCopy);
  }, [generatedItems, dataType, loremSubtype]);

  // Copy single item handler
  const handleCopyItem = useCallback((item: string, index: number) => {
    copyToClipboard(item);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }, []);

  // Clear handler
  const handleClear = useCallback(() => {
    setGeneratedItems([]);
  }, []);

  const countPresets = useMemo(() => [1, 5, 10, 25, 50], []);

  return (
    <div className="tool-container dummy-data-tool">
      {/* Type Selector */}
      <div className="section">
        <label className="label">Data Category</label>
        <div className="dummy-category-grid">
          <button
            type="button"
            className={`dummy-type-btn ${dataType === 'lorem' ? 'active' : ''}`}
            onClick={() => setDataType('lorem')}
          >
            <span className="dummy-type-icon">📝</span>
            <span>Lorem Ipsum</span>
          </button>
          <button
            type="button"
            className={`dummy-type-btn ${dataType === 'names' ? 'active' : ''}`}
            onClick={() => setDataType('names')}
          >
            <span className="dummy-type-icon">👤</span>
            <span>Names</span>
          </button>
          <button
            type="button"
            className={`dummy-type-btn ${dataType === 'emails' ? 'active' : ''}`}
            onClick={() => setDataType('emails')}
          >
            <span className="dummy-type-icon">✉️</span>
            <span>Emails</span>
          </button>
          <button
            type="button"
            className={`dummy-type-btn ${dataType === 'phones' ? 'active' : ''}`}
            onClick={() => setDataType('phones')}
          >
            <span className="dummy-type-icon">📞</span>
            <span>Phone</span>
          </button>
          <button
            type="button"
            className={`dummy-type-btn ${dataType === 'addresses' ? 'active' : ''}`}
            onClick={() => setDataType('addresses')}
          >
            <span className="dummy-type-icon">🏠</span>
            <span>Addresses</span>
          </button>
          <button
            type="button"
            className={`dummy-type-btn ${dataType === 'numbers' ? 'active' : ''}`}
            onClick={() => setDataType('numbers')}
          >
            <span className="dummy-type-icon">🔢</span>
            <span>Numbers</span>
          </button>
        </div>
      </div>

      {/* Category Specific Options */}
      <div className="section dummy-options-section">
        <label className="label">Options</label>

        {dataType === 'lorem' && (
          <div className="dummy-opt-row">
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${loremSubtype === 'paragraphs' ? 'active' : ''}`}
                onClick={() => setLoremSubtype('paragraphs')}
              >
                Paragraphs
              </button>
              <button
                type="button"
                className={`toggle-btn ${loremSubtype === 'sentences' ? 'active' : ''}`}
                onClick={() => setLoremSubtype('sentences')}
              >
                Sentences
              </button>
              <button
                type="button"
                className={`toggle-btn ${loremSubtype === 'words' ? 'active' : ''}`}
                onClick={() => setLoremSubtype('words')}
              >
                Words
              </button>
            </div>

            {loremSubtype !== 'words' && (
              <label className="dummy-checkbox-label">
                <input
                  type="checkbox"
                  checked={startWithLorem}
                  onChange={(e) => setStartWithLorem(e.target.checked)}
                />
                <span>Start with &quot;Lorem ipsum&quot;</span>
              </label>
            )}
          </div>
        )}

        {dataType === 'names' && (
          <div className="dummy-opt-row">
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${nameSubtype === 'full' ? 'active' : ''}`}
                onClick={() => setNameSubtype('full')}
              >
                Full Name
              </button>
              <button
                type="button"
                className={`toggle-btn ${nameSubtype === 'first' ? 'active' : ''}`}
                onClick={() => setNameSubtype('first')}
              >
                First Name
              </button>
              <button
                type="button"
                className={`toggle-btn ${nameSubtype === 'last' ? 'active' : ''}`}
                onClick={() => setNameSubtype('last')}
              >
                Last Name
              </button>
            </div>
          </div>
        )}

        {dataType === 'emails' && (
          <div className="dummy-opt-row">
            <span className="dummy-hint-text">
              Generates randomized developer & corporate emails from human names.
            </span>
          </div>
        )}

        {dataType === 'phones' && (
          <div className="dummy-opt-row">
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${phoneFormat === 'us' ? 'active' : ''}`}
                onClick={() => setPhoneFormat('us')}
              >
                (555) 123-4567
              </button>
              <button
                type="button"
                className={`toggle-btn ${phoneFormat === 'international' ? 'active' : ''}`}
                onClick={() => setPhoneFormat('international')}
              >
                +1 (555)...
              </button>
              <button
                type="button"
                className={`toggle-btn ${phoneFormat === 'dashed' ? 'active' : ''}`}
                onClick={() => setPhoneFormat('dashed')}
              >
                555-123-4567
              </button>
              <button
                type="button"
                className={`toggle-btn ${phoneFormat === 'digits' ? 'active' : ''}`}
                onClick={() => setPhoneFormat('digits')}
              >
                +15551234567
              </button>
            </div>
          </div>
        )}

        {dataType === 'addresses' && (
          <div className="dummy-opt-row">
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${addressSubtype === 'full' ? 'active' : ''}`}
                onClick={() => setAddressSubtype('full')}
              >
                Full Address
              </button>
              <button
                type="button"
                className={`toggle-btn ${addressSubtype === 'street' ? 'active' : ''}`}
                onClick={() => setAddressSubtype('street')}
              >
                Street Only
              </button>
              <button
                type="button"
                className={`toggle-btn ${addressSubtype === 'city-state-zip' ? 'active' : ''}`}
                onClick={() => setAddressSubtype('city-state-zip')}
              >
                City, State, Zip
              </button>
            </div>
          </div>
        )}

        {dataType === 'numbers' && (
          <div className="dummy-opt-row flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${numberType === 'integer' ? 'active' : ''}`}
                  onClick={() => setNumberType('integer')}
                >
                  Integer
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${numberType === 'decimal' ? 'active' : ''}`}
                  onClick={() => setNumberType('decimal')}
                >
                  Decimal
                </button>
              </div>

              {numberType === 'decimal' && (
                <div className="flex items-center gap-2">
                  <span className="dummy-field-label">Decimals:</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={decimalPlaces}
                    onChange={(e) => setDecimalPlaces(Math.max(1, Math.min(6, parseInt(e.target.value) || 2)))}
                    className="input dummy-num-input"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="dummy-field-label">Min:</span>
                <input
                  type="number"
                  value={numMin}
                  onChange={(e) => setNumMin(parseInt(e.target.value) || 0)}
                  className="input dummy-num-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="dummy-field-label">Max:</span>
                <input
                  type="number"
                  value={numMax}
                  onChange={(e) => setNumMax(parseInt(e.target.value) || 100)}
                  className="input dummy-num-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Count Selector */}
        <div className="dummy-count-control">
          <div className="flex items-center justify-between">
            <span className="dummy-field-label">Count (1-100):</span>
            <div className="dummy-presets">
              {countPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`btn btn-sm ${count === preset ? 'btn-primary' : ''}`}
                  onClick={() => setCount(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="dummy-range-slider flex-1"
            />
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="input dummy-count-input"
            />
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="toolbar justify-between">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
        >
          <span>⚡</span> Generate
        </button>

        <div className="flex gap-2">
          {generatedItems.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={handleCopyAll}
              title="Copy all items to clipboard"
            >
              📋 Copy All
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleClear}
            title="Clear output"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div className="section flex-1 dummy-output-section">
        <div className="flex items-center justify-between dummy-output-header">
          <label className="label" style={{ marginBottom: 0 }}>
            Generated Output ({generatedItems.length})
          </label>
          {generatedItems.length > 0 && (
            <span className="badge">{dataType}</span>
          )}
        </div>

        {generatedItems.length === 0 ? (
          <div className="dummy-empty-state">
            <span className="dummy-empty-icon">🎲</span>
            <p>No data generated yet. Click &quot;Generate&quot; to create items.</p>
          </div>
        ) : (
          <div className="dummy-list-container">
            {generatedItems.map((item, index) => (
              <div key={index} className="dummy-list-item">
                <span className="dummy-item-index">#{index + 1}</span>
                <div className="dummy-item-content">{item}</div>
                <button
                  type="button"
                  className="btn btn-sm dummy-item-copy-btn"
                  onClick={() => handleCopyItem(item, index)}
                  title="Copy this item"
                >
                  {copiedIndex === index ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DummyDataGenerator;
