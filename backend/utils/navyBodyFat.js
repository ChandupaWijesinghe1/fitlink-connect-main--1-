const cmToInches = (cm) => Number(cm) / 2.54;

export const estimateNavyBodyFat = ({ gender, heightCm, waist, neck, hip }) => {
  const height = cmToInches(heightCm);
  const waistIn = cmToInches(waist);
  const neckIn = cmToInches(neck);
  const hipIn = hip ? cmToInches(hip) : null;

  if (!heightCm || !waist || !neck || height <= 0 || waistIn <= neckIn) {
    return null;
  }

  if (gender === "female") {
    if (!hipIn) return null;
    const value = waistIn + hipIn - neckIn;
    if (value <= 0) return null;
    return Number(
      (163.205 * Math.log10(value) - 97.684 * Math.log10(height) - 78.387).toFixed(1)
    );
  }

  const value = waistIn - neckIn;
  if (value <= 0) return null;
  return Number(
    (86.01 * Math.log10(value) - 70.041 * Math.log10(height) + 36.76).toFixed(1)
  );
};
