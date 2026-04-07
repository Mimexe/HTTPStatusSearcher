import fs from "fs";

export type StatusCode = {
  code: number | string;
  message: string;
  description: string;
};

export type ParsedCodes = {
  downloadOn?: string;
  codes: Record<string, StatusCode>;
};

export const validateStatusInput = (
  input: string,
  message = false,
): boolean | string => {
  if (input == "*") return true;

  if (input.endsWith("xx") && !isNaN(parseInt(input[0] || "XX"))) return true;

  if (isNaN(parseInt(input)))
    return message ? "Please enter a valid number" : false;

  if (parseInt(input) < 100 || parseInt(input) > 599)
    return message ? "Please enter a valid status code" : false;

  return true;
};

export const parseCodesFile = (filePath = "./codes.json"): ParsedCodes => {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<
    string,
    unknown
  >;
  const { downloadOn, ...rest } = raw;

  return {
    downloadOn: typeof downloadOn === "string" ? downloadOn : undefined,
    codes: rest as Record<string, StatusCode>,
  };
};

export const isCodesOutdated = (
  downloadOn: string | undefined,
  now = new Date(),
): boolean => {
  if (!downloadOn) return true;

  const downloadedDate = new Date(downloadOn);
  const diff = now.getTime() - downloadedDate.getTime();
  const diffDays = diff / (1000 * 3600 * 24);

  return diffDays > 30;
};

export const searchStatusCodes = (
  codes: Record<string, StatusCode>,
  search: string,
): string[] => {
  const term = search.toLowerCase();

  return Object.keys(codes).filter((code) => {
    return (
      codes[code].code.toString().toLowerCase().includes(term) ||
      codes[code].message.toLowerCase().includes(term) ||
      codes[code].description.toLowerCase().includes(term)
    );
  });
};

export const formatStatusLine = (code: string, status: StatusCode): string => {
  return `${code} ${status.message} - ${status.description}`;
};
