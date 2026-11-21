import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  PLACEHOLDER,
  REQUIRED_IAM_ACTIONS,
  renderAmplifyPolicy,
} from "../../scripts/render-amplify-policy";

type Policy = {
  Version?: string;
  DoNotAttach?: string;
  Statement?: Array<{
    Effect?: string;
    Action?: string | string[];
    Resource?: string | string[];
  }>;
};

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("amplify compute IAM template", () => {
  it("is a non-attachable template with a render placeholder", () => {
    const raw = read("infra/amplify-compute-policy.json");
    const policy = JSON.parse(raw) as Policy;
    expect(policy.DoNotAttach).toMatch(/npm run iam:policy/);
    expect(raw).toContain(PLACEHOLDER);
    expect(raw).not.toMatch(/\$\{RASTABAAZ_TABLE_NAME\}/);
    expect(raw).not.toMatch(/"dynamodb:\*"/);
    expect(raw).not.toMatch(/s3:|appsync:|cognito-/i);
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("renders a least-privilege policy for a valid table name", () => {
    const rendered = renderAmplifyPolicy("rastabaaz-dev");
    expect(rendered.Version).toBe("2012-10-17");
    expect(rendered.DoNotAttach).toBeUndefined();
    expect(rendered.Statement).toHaveLength(1);
    const [statement] = rendered.Statement;
    expect(statement.Effect).toBe("Allow");
    expect([...statement.Action].sort()).toEqual([...REQUIRED_IAM_ACTIONS].sort());
    expect(statement.Resource).toEqual([
      "arn:aws:dynamodb:*:*:table/rastabaaz-dev",
      "arn:aws:dynamodb:*:*:table/rastabaaz-dev/index/*",
    ]);
    const json = JSON.stringify(rendered);
    expect(json).not.toContain(PLACEHOLDER);
    expect(json).not.toContain("${");
    expect(json).not.toMatch(/"dynamodb:\*"/);
    expect(() => renderAmplifyPolicy("${RASTABAAZ_TABLE_NAME}")).toThrow(
      /Invalid DynamoDB table name/,
    );
    expect(() => renderAmplifyPolicy(PLACEHOLDER)).toThrow(/Invalid DynamoDB table name/);
    expect(() => renderAmplifyPolicy("ab")).toThrow(/Invalid DynamoDB table name/);
    expect(() => renderAmplifyPolicy("bad/name")).toThrow(/Invalid DynamoDB table name/);
  });

  it("documents the render command", () => {
    const docs = read("infra/README.md");
    expect(docs).toMatch(/npm run -s iam:policy -- --table /);
    expect(docs).toMatch(/Do not attach the template/);
    expect(docs).toMatch(/aws iam put-role-policy|aws iam create-policy/);
  });
});
