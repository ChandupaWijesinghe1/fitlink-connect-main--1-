// Escapes user input so it can be used safely inside a MongoDB $regex.
export const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
