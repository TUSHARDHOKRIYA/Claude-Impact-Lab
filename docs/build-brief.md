# Kala Ghoda Khabar build brief

This note describes the demo as it runs now.

## What it is

Kala Ghoda Khabar is a demo street-reporting site for the Kala Ghoda precinct in Mumbai (A Ward). It is not a BMC complaint portal.

The landing page `/` is the report form. The map is secondary. It lives at `/map` and opens from the Map button in the header.

## Report flow

1. Photo. The person takes one or chooses one. The browser compresses it to at most 1280 px on the long edge and at most 256 KB.
2. Answers, by voice chat or by tapping.
   - Issue type. The nine types are Road, Footpath, Drainage, Waste, Parking and vehicle occupation, Lighting, Street furniture, Obstruction and encroachment, and Other.
   - When noticed. The five choices are Today, This week, This month, 1 to 6 months ago, and More than six months ago.
   - Whether it recurs.
   - What it affects. The seven options are Walking, Wheeling, Driving, Waiting, Businesses nearby, The heritage setting, and Safety at night.
   - Optional description.
   - A place pin. There is no default pin. The person taps the map, picks a landmark, or uses their location, then confirms.
3. Check, then the button "Record this condition".

After recording, a Submitted screen links to `/map?report=<id>`, where that report is highlighted, and to the public report page `/reports/<id>`.

## Voice

Voice is off until `NEXT_PUBLIC_VOICE_UI=1`.

Speech-to-text is Sarvam `saaras`, for code-mixed Hindi, Marathi, and English. Replies are spoken with Sarvam `bulbul`. Slot filling uses an OpenAI-compatible chat model. The tools are `save_issue_type`, `save_noticed_window`, `save_recurs`, `save_affects`, `save_description`, and `propose_pin`. There is no submit tool. A person taps Record.

Each voice turn has a 20 second budget and at most 3 model turns. Rate limits are per isolate. The verbatim transcript is stored and is never shown on a public page. Variable names are in `.env.example`.

## Places

Reports of the same issue type within 40 m share one place. A place name comes from the nearest OpenStreetMap street (`src/lib/streets.data.json`, ODbL) and the nearest verified landmark (`src/lib/landmarks.data.json`).

## Storage

One DynamoDB table, defined in `infra/khabar-table.yaml`. Billing is `PAY_PER_REQUEST`. Point-in-time recovery is on.

Keys are `pk` and `sk`. `gsi1` holds the slug and reports by location. `gsi2` holds geo cells. `byType` is `type` plus `pk`, with an INCLUDE projection that omits photos. The map catalog reads `byType`. If that index is not on the table yet, the app falls back to a scan until it is.

Photos are their own item (`sk = PHOTO`). They are served by `GET /reports/<id>/photo` with cache headers.

Seed the table with `npm run seed`. Seeded reports are real issues. A local run without AWS uses `KHABAR_REPO=memory npm run dev`. Those records stay in memory and disappear when the server stops.

## Desk

`/admin` is the desk. The password is `ADMIN_KEY`. The session is an HMAC cookie. The desk can edit issue type, description, and whether a report recurs, and it can add notes. The demo has no takedown workflow.

## Hosting and checks

AWS Amplify Hosting serves the SSR app from the `dev` branch (`amplify.yml`). `npm run iam:policy` renders the IAM policy template in `infra/`.

Checks are `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`. CI is `.github/workflows/verify.yml`. Every source file stays at or under 300 lines.
