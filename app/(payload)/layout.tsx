import type { ServerFunctionClient } from "payload";

import config from "@payload-config";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import React from "react";

import { importMap } from "./admin/importMap.js";

import "@payloadcms/next/css";

/**
 * Payload's admin owns its own <html> and <body>, which is why the FAMPIRE
 * front end had to move into a sibling (frontend) route group. Route groups do
 * not appear in URLs, so every public path is byte-identical to before.
 */
const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  );
}
