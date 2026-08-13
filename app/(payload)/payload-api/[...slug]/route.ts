import config from "@payload-config";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
} from "@payloadcms/next/routes";

/**
 * Mounted at /payload-api rather than /api — see the note in payload.config.ts.
 * The front end owns /api/auth and LoginForm.tsx hard-codes it.
 *
 * This version of @payloadcms/next exports no REST_PUT; Payload uses PATCH for
 * updates, so there is nothing missing here.
 */
export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const OPTIONS = REST_OPTIONS(config);
