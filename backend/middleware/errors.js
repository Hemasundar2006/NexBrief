export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
export function notFound(_req, res) {
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "API route not found." } });
}
export function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error?.name === "CastError")
    return res.status(400).json({ error: { code: "INVALID_ID" } });
  if (error?.code === 11000)
    return res.status(409).json({ error: { code: "DUPLICATE_RECORD" } });
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
  });
}
