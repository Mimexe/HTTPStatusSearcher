#!/usr/bin/env node
import fs from "fs";
import logger from "consola";
// @ts-ignore
import enquirer from "enquirer";
const { prompt } = enquirer;

type StatusCode = {
  code: number;
  message: string;
  description: string;
};

type ParsedCodes = {
  downloadOn?: string;
  codes: Record<string, StatusCode>;
};

const validate: (input: string, message?: boolean) => boolean | string = (
  input,
  message = false,
) => {
  if (input == "*") return true;

  if (input.endsWith("xx") && !isNaN(parseInt(input[0] || "XX"))) return true;

  if (isNaN(parseInt(input)))
    return message ? "Please enter a valid number" : false;

  if (parseInt(input) < 100 || parseInt(input) > 599)
    return message ? "Please enter a valid status code" : false;

  return true;
};

const parseCodesFile = (): ParsedCodes => {
  const raw = JSON.parse(fs.readFileSync("./codes.json", "utf-8")) as Record<
    string,
    unknown
  >;
  const { downloadOn, ...rest } = raw;

  return {
    downloadOn: typeof downloadOn === "string" ? downloadOn : undefined,
    codes: rest as Record<string, StatusCode>,
  };
};

const downloadJson = async (silent: boolean = false) => {
  if (!silent) logger.info("Downloading json file...");
  const response = await fetch("https://status.js.org/codes.json");
  const data = await response.json();
  data["downloadOn"] = new Date().toISOString();
  fs.writeFileSync("./codes.json", JSON.stringify(data));
  if (!silent)
    logger.success("Downloaded " + Object.keys(data).length + " status codes");
};

const main = async () => {
  if (!fs.existsSync("./codes.json")) {
    await downloadJson();
  }

  let { downloadOn, codes } = parseCodesFile();

  if (!downloadOn) {
    logger.warn("The json file is outdated, redownloading...");
    await downloadJson(false);
    ({ downloadOn, codes } = parseCodesFile());
  } else {
    const downloadedDate: Date = new Date(downloadOn);
    const now: Date = new Date();
    const diff: number = now.getTime() - downloadedDate.getTime();
    const diffDays: number = diff / (1000 * 3600 * 24);
    if (diffDays > 30) {
      logger.warn("The json file is outdated, redownloading...");
      await downloadJson(false);
      ({ downloadOn, codes } = parseCodesFile());
    }
  }

  logger.info("HTTP Status Codes provided by status.js.org");

  if (process.argv[2]) {
    if (process.argv[2] == "search") {
      const search = process.argv.slice(3).join(" ");
      if (!search) {
        logger.error("Please enter a search query");
        process.stdout.write("Press enter to exit...");
        process.stdin.once("data", () => process.exit(0));
        return;
      }

      const results = Object.keys(codes).filter((code) => {
        return (
          codes[code].code
            .toString()
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          codes[code].message.toLowerCase().includes(search.toLowerCase()) ||
          codes[code].description.toLowerCase().includes(search.toLowerCase())
        );
      });

      if (results.length == 0) {
        logger.error("No results found");
        process.stdout.write("Press enter to exit...");
        process.stdin.once("data", () => process.exit(0));
        return;
      }

      logger.info("Results:");
      for (const code of results) {
        logger.info(
          `${code} ${codes[code].message} - ${codes[code].description}`,
        );
      }
      process.stdout.write("Press enter to exit...");
      process.stdin.once("data", () => process.exit(0));
      return;
    } else if (
      ["redl", "dl", "download", "redownload", "update"].includes(
        process.argv[2],
      )
    ) {
      await downloadJson();
      process.stdout.write("Press enter to exit...");
      process.stdin.once("data", () => process.exit(0));
      return;
    }

    if (validate(process.argv[2]) !== true) {
      logger.error("Invalid status code");
      logger.error(validate(process.argv[2], true));
      return;
    }

    if (process.argv[2] == "*") {
      logger.info("All status codes:");
      for (const code in codes) {
        logger.info(
          `${code} ${codes[code].message} - ${codes[code].description}`,
        );
      }
      process.stdout.write("Press enter to exit...");
      process.stdin.once("data", () => process.exit(0));
      return;
    }

    const status = codes[process.argv[2]];
    if (!status) {
      logger.error("Invalid status code");
      process.stdout.write("Press enter to exit...");
      process.stdin.once("data", () => process.exit(0));
      return;
    }

    logger.info(`${status.code} ${status.message}`);
    logger.info("Description: " + status.description);
    process.stdout.write("Press enter to exit...");
    process.stdin.once("data", () => process.exit(0));
    return;
  }

  const { action } = (await prompt({
    type: "select",
    name: "action",
    message: "What do you want to do?",
    choices: [
      { name: "get", message: "Get a http status code" },
      { name: "redownload", message: "Redownload the json file" },
      { name: "exit", message: "Exit" },
    ],
  })) as { action: "get" | "redownload" | "exit" };

  switch (action) {
    case "get":
      const { code } = (await prompt({
        type: "input",
        name: "code",
        message: "What code do you want to get?",
        validate: (input: string) => {
          return validate(input, true);
        },
      })) as { code: string };

      if (code == "*") {
        logger.info("All status codes:");
        for (const key in codes) {
          logger.info(
            `${key} ${codes[key].message} - ${codes[key].description}`,
          );
        }
        main();
        return;
      }

      const status = codes[code];
      if (!status) {
        logger.error("Invalid status code");
        main();
        return;
      }

      logger.info(`${status.code} ${status.message}`);
      logger.info("Description: " + status.description);
      main();
      break;

    case "redownload":
      await downloadJson();
      main();
      break;

    case "exit":
      logger.info("Bye!");
      process.exit(0);

    default:
      logger.error("Invalid action");
      main();
  }
};

main();

process.on("uncaughtException", (err) => {
  logger.fatal(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.fatal(err);
  process.exit(1);
});

process.on("warning", (warn) => {
  logger.warn(warn);
});
