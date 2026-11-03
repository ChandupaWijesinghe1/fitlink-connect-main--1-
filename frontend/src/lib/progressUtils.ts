export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDays = (date: string, amount: number) => {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
};

export const movingAverage = (values: Array<number | null>, windowSize = 7) => {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - windowSize + 1), index + 1).filter((v) => v != null) as number[];
    if (!slice.length) return null;
    return Number((slice.reduce((sum, value) => sum + value, 0) / slice.length).toFixed(1));
  });
};

export const filterByRange = <T extends { date: string }>(rows: T[], days: number) => {
  const start = addDays(todayISO(), -days + 1);
  return (Array.isArray(rows) ? rows : []).filter((row) => String(row.date) >= start);
};

export const deltaLabel = (current?: number | null, previous?: number | null, invert = false) => {
  if (current == null || previous == null) return { text: "No previous data", improved: null as boolean | null };
  const diff = Number((current - previous).toFixed(1));
  if (diff === 0) return { text: "No change", improved: null };
  const improved = invert ? diff < 0 : diff > 0;
  const sign = diff > 0 ? "+" : "";
  return { text: `${sign}${diff} vs last period`, improved };
};

export const compressAndPrivacyBlur = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 900;
      let { width, height } = img;
      if (width > max || height > max) {
        const ratio = Math.min(max / width, max / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const faceHeight = Math.round(height * 0.32);
      const small = document.createElement("canvas");
      small.width = Math.max(8, Math.round(width / 18));
      small.height = Math.max(6, Math.round(faceHeight / 18));
      const smallCtx = small.getContext("2d");
      if (smallCtx) {
        smallCtx.drawImage(canvas, 0, 0, width, faceHeight, 0, 0, small.width, small.height);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, width, faceHeight);
      }

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => reject(new Error("Invalid image"));
    img.src = url;
  });
};
