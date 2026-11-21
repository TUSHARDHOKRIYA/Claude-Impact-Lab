import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PLACEHOLDER = "__KHABAR_TABLE_NAME__";
export const TEMPLATE_PATH = "infra/amplify-compute-policy.json";
export const TABLE_NAME_PATTERN = /^[a-zA-Z0-9_.-]{3,255}$/;

export const REQUIRED_IAM_ACTIONS = [
  "dynamodb:GetItem",
  "dynamodb:PutItem",
  "dynamodb:UpdateItem",
  // Creating a place writes the location, its slug lock, its place lock and
  // the report in one transact; an admin move to a new place does the same.
  "dynamodb:TransactWriteItems",
  "dynamodb:Query",
  "dynamodb:Scan",
  "dynamodb:DescribeTable",
] as const;

export type RenderedPolicy = {
  Version: string;
  DoNotAttach?: string;
  Statement: Array<{
    Sid?: string;
    Effect: string;
    Action: string[];
    Resource: string[];
  }>;
};

export function assertTableName(tableName: string): string {
  if (
    !TABLE_NAME_PATTERN.test(tableName) ||
    tableName.includes("$") ||
    tableName.includes("__")
  ) {
    throw new Error(`Invalid DynamoDB table name: ${tableName}`);
  }
  return tableName;
}

export function parseTableArg(argv: string[]): string {
  const flag = argv.indexOf("--table");
  const value = flag >= 0 ? argv[flag + 1] : argv[0];
  if (!value || value.startsWith("-")) {
    throw new Error("Usage: npm run iam:policy -- --table <table-name>");
  }
  return assertTableName(value);
}

export function renderAmplifyPolicy(
  tableName: string,
  templateSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", TEMPLATE_PATH),
    "utf8",
  ),
): RenderedPolicy {
  const name = assertTableName(tableName);
  const template = JSON.parse(templateSource) as RenderedPolicy;
  delete template.DoNotAttach;
  const json = JSON.stringify(template).split(PLACEHOLDER).join(name);
  if (json.includes(PLACEHOLDER) || json.includes("${")) {
    throw new Error("Unresolved IAM policy placeholder.");
  }
  return JSON.parse(json) as RenderedPolicy;
}

function isCli(): boolean {
  return process.argv.some((arg) =>
    arg.replace(/\\/g, "/").endsWith("/scripts/render-amplify-policy.ts"),
  );
}

if (isCli()) {
  const policy = renderAmplifyPolicy(parseTableArg(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(policy, null, 2)}\n`);
}
