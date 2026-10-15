import "server-only";

// The version of everything the model sees: the interpret and explain system
// prompts, the JSON schemas sent with them, and the call settings that shape the
// output (effort, thinking, max tokens). Bump it on any change to one of those,
// so a request log line or an eval result can be read against the prompt that
// produced it. Format: the date of the change, then a counter for that day.
export const PROMPT_VERSION = "2026-10-15.1";
