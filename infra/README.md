# Amplify compute IAM

Do not attach the template `amplify-compute-policy.json`. AWS IAM will not interpolate placeholders, and the file includes `DoNotAttach` so attach-as-is is rejected.

Render a table-scoped policy, then attach it to the Amplify SSR compute role:

```bash
npm run -s iam:policy -- --table khabar-dev > /tmp/khabar-amplify-policy.json
aws iam put-role-policy \
  --role-name <AmplifyComputeRole> \
  --policy-name khabar-dynamo \
  --policy-document file:///tmp/khabar-amplify-policy.json
```

The renderer validates DynamoDB table names and emits JSON for that table plus `index/*` only. It never uses `dynamodb:*` or all tables. Amplify supplies `AWS_REGION` and the compute role at runtime; do not bake AWS credentials into the policy or `.env.production`.
