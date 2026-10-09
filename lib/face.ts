export const FACE_DESCRIPTOR_LENGTH = 128;
export const FACE_DISTANCE_THRESHOLD = 0.6;
export function isValidDescriptor(value: unknown): value is number[] { return Array.isArray(value) && value.length === FACE_DESCRIPTOR_LENGTH && value.every((n) => typeof n === "number" && Number.isFinite(n) && n >= -2 && n <= 2); }
export function euclideanDistance(a: number[], b: number[]) { if (a.length !== FACE_DESCRIPTOR_LENGTH || b.length !== FACE_DESCRIPTOR_LENGTH) return Number.POSITIVE_INFINITY; let sum = 0; for (let i = 0; i < FACE_DESCRIPTOR_LENGTH; i++) sum += (a[i] - b[i]) ** 2; return Math.sqrt(sum); }
