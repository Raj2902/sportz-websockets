import arcjet, { slidingWindow, detectBot, shield } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjectMode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) throw new Error("ARCJET_KEY enviroment variable is missing");

export const httpArcjet = arcjetKey
  ? arcjet({
      key: process.env.ARCJET_KEY,
      rules: [
        shield({ mode: arcjectMode }),
        detectBot({
          mode: arcjectMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjectMode,
          interval: 10,
          max: 60,
        }),
      ],
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: process.env.ARCJET_KEY,
      rules: [
        shield({ mode: arcjectMode }),
        detectBot({
          mode: arcjectMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({
          mode: arcjectMode,
          interval: "2s",
          max: 5,
        }),
      ],
    })
  : null;

export function securityMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjet) return next();

    try {
      const decission = await httpArcjet.protect(req);

      if (decission.isDenied()) {
        if (decission.reason.isRateLimit()) {
          return res.status(429).json({ error: "Too many requests" });
        }
        return res.status(403).json({ error: "Forbidden" });
      }
    } catch (e) {
      console.error("Arcjet middleware error", e);
      return res.status(503).json({ error: "Service Unavailable" });
    }

    next();
  };
}
