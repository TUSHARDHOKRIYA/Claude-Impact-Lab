/**
 * Whether the form offers the voice recorder.
 *
 * Off by default. Nothing under `src/lib/voice/` is deleted by this: the server
 * action, the tool contract, the extractor and their tests all stay and all
 * still run. This flag only decides whether a person is offered a microphone,
 * and it is off because no clip has ever been transcribed by a real provider
 * from this codebase — no key has been configured, and the bake-off that exists
 * to prove a model can emit these tool calls has never been run.
 *
 * Set `NEXT_PUBLIC_VOICE_UI=1` to put the recorder back. `NEXT_PUBLIC_` is
 * required: the value is read in a client component and is inlined at build.
 */
export const VOICE_UI_ENABLED = process.env.NEXT_PUBLIC_VOICE_UI === "1";
