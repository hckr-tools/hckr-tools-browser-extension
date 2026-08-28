export const MAX_LIVE_TEXT_CHARS = 250_000;
export const MAX_REGEX_TEST_CHARS = 50_000;
export const MAX_JSON_TREE_NODES = 5_000;

export function exceedsLiveTextLimit(value: string): boolean {
  return value.length > MAX_LIVE_TEXT_CHARS;
}
