export const getKeyByValue = <TKey, TValue>(
  map: Map<TKey, TValue>,
  value: TValue
): TKey | undefined => {
  for (const [key, val] of map.entries()) {
    if (val === value) {
      return key;
    }
  }
};
