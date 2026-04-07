#!/usr/bin/env node
import fs from "fs";
import logger from "consola";
// @ts-ignore
import enquirer from "enquirer";
import {
  formatStatusLine,
  isCodesOutdated,
  parseCodesFile,
  searchStatusCodes,
  validateStatusInput,
} from "./core.js";
const { prompt } = enquirer;

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

  if (isCodesOutdated(downloadOn)) {
    logger.warn("The json file is outdated, redownloading...");
    await downloadJson(false);
    ({ downloadOn, codes } = parseCodesFile());
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

      const results = searchStatusCodes(codes, search);

      if (results.length == 0) {
        logger.error("No results found");
        process.stdout.write("Press enter to exit...");
        process.stdin.once("data", () => process.exit(0));
        return;
      }

      logger.info("Results:");
      for (const code of results) {
        logger.info(formatStatusLine(code, codes[code]));
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

    if (validateStatusInput(process.argv[2]) !== true) {
      logger.error("Invalid status code");
      logger.error(validateStatusInput(process.argv[2], true));
      return;
    }

    if (process.argv[2] == "*") {
      logger.info("All status codes:");
      for (const code in codes) {
        logger.info(formatStatusLine(code, codes[code]));
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
          return validateStatusInput(input, true);
        },
      })) as { code: string };

      if (code == "*") {
        logger.info("All status codes:");
        for (const key in codes) {
          logger.info(formatStatusLine(key, codes[key]));
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
