import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { copyToClipboard } from '../../shared/clipboard';
import {
  formatInZone,
  formatRelative,
  nextCronRuns,
  parseCronExpression,
} from '../../shared/cron';
import { loadToolState, saveToolState } from '../../shared/storage';
import './CronExplainer.css';

interface CronExplainerProps {
  initialInput?: string;
}

const TOOL_ID = 'cron-explainer';
const NEXT_COUNT = 10;

const SAMPLES = [
  { label: 'Every 5 min', expr: '*/5 * * * *' },
  { label: 'Weekdays 9am', expr: '0 9 * * 1-5' },
  { label: 'Hourly', expr: '@hourly' },
  { label: 'Midnight', expr: '0 0 * * *' },
  { label: '1st of month', expr: '0 0 1 * *' },
];

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'local', label: 'Browser local' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Chicago', label: 'America/Chicago' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney' },
];

const CronExplainer: React.FC<CronExplainerProps> = ({ initialInput }) => {
  const [expression, setExpression] = useState('');
  const [timezone, setTimezone] = useState('local');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (initialInput !== undefined && initialInput !== '') {
      setExpression(initialInput.trim());
      return;
    }
    (async () => {
      const saved = await loadToolState(TOOL_ID);
      if (saved?.input) setExpression(saved.input);
      const tz = saved?.options?.timezone;
      if (typeof tz === 'string' && TIMEZONES.some((item) => item.value === tz)) {
        setTimezone(tz);
      }
    })();
  }, [initialInput]);

  const persist = useCallback((nextExpr: string, nextTz: string) => {
    saveToolState(TOOL_ID, { input: nextExpr, options: { timezone: nextTz } }).catch(console.error);
  }, []);

  const zoneId = timezone === 'local' ? undefined : timezone;
  const parsed = useMemo(() => parseCronExpression(expression), [expression]);
  const upcoming = useMemo(() => {
    if (!parsed.schedule || parsed.error) return [];
    return nextCronRuns(parsed.schedule, now, zoneId, NEXT_COUNT);
  }, [parsed, now, zoneId]);

  const handleExpressionChange = (value: string) => {
    setExpression(value);
    persist(value, timezone);
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    persist(expression, value);
  };

  const handleClear = () => {
    setExpression('');
    persist('', timezone);
  };

  return (
    <div className="tool-container cron-explainer">
      <div className="section cron-input-card">
        <div className="cron-header">
          <label className="label" htmlFor="cron-expression">Cron expression</label>
          {parsed.schedule && !parsed.error && (
            <span className="badge">{parsed.schedule.seconds ? '6 fields' : parsed.schedule.isReboot ? '@reboot' : '5 fields'}</span>
          )}
          {parsed.error && <span className="badge badge-error">Invalid</span>}
        </div>

        <input
          id="cron-expression"
          className="input cron-expression-input"
          value={expression}
          onChange={(e) => handleExpressionChange(e.target.value)}
          placeholder="e.g. 0 9 * * 1-5  or  @hourly"
          spellCheck={false}
          autoFocus
        />

        <div className="cron-controls">
          <label className="cron-tz-label" htmlFor="cron-timezone">
            Timezone
            <select
              id="cron-timezone"
              className="input cron-tz-select"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-sm btn-danger" onClick={handleClear} disabled={!expression}>
            Clear
          </button>
        </div>

        <div className="cron-samples">
          <span className="cron-samples-label">Samples:</span>
          {SAMPLES.map((sample) => (
            <button
              key={sample.expr}
              type="button"
              className="cron-sample-chip"
              onClick={() => handleExpressionChange(sample.expr)}
            >
              {sample.label}
            </button>
          ))}
        </div>

        {parsed.error && <div className="error-msg">{parsed.error}</div>}
      </div>

      {parsed.description && (
        <div className="section cron-description-card">
          <div className="cron-section-header">
            <span className="label">Schedule</span>
            <button className="btn btn-sm" onClick={() => copyToClipboard(parsed.description)}>
              Copy
            </button>
          </div>
          <p className="cron-description">{parsed.description}</p>
        </div>
      )}

      {parsed.schedule && !parsed.schedule.isReboot && !parsed.error && (
        <div className="section cron-upcoming-card">
          <div className="cron-section-header">
            <span className="label">Next {NEXT_COUNT} runs</span>
            <span className="cron-zone-hint">{timezone === 'local' ? 'Browser local' : timezone}</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="cron-empty">No matching times in the next year. Check day/month constraints.</p>
          ) : (
            <div className="cron-run-list">
              {upcoming.map((run) => (
                <div className="cron-run-row" key={run.getTime()}>
                  <span className="cron-run-when">{formatInZone(run, zoneId)}</span>
                  <span className="cron-run-rel">{formatRelative(now, run)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CronExplainer;
