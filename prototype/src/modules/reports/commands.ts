import { ApiError, mutate, defineCommand } from "../../api/client";

/** USR-016: every report export is an audit event, and restricted reports refuse to export. */
function logReportExportLocal(reportId: string, rows: number) {
  return mutate(
    (db) => {
      const r = db.reports.find((x) => x.id === reportId);
      if (!r) throw new ApiError(`Report ${reportId} not found`, "NOT_FOUND");
      if (r.restricted) throw new ApiError(`${r.name} is restricted to ${r.owner}. Export refused and logged.`, "BLOCKED");
      return r;
    },
    { action: `exported ${rows} rows of`, reference: reportId, module: "reports" },
    160,
  );
}

/* Routed to the Threadline API in remote mode; the bodies above are the in-browser implementation. */
export const logReportExport = defineCommand("reports.logExport", (reportId, rows) => ({ reportId, rows }), logReportExportLocal);
