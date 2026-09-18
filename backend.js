'use strict';
/**
 * The reference third-party backend: an agent over the core file kit and
 * shell, two app tools whose bodies run in this process, and per-session
 * memory through the core store. Everything it reaches comes through
 * `ctx`; it imports only the SDK and Node core.
 */
const { defineApp, tool, p } = require('@hearthscale/app');

const PERSONA = [
  'You are Coder, a careful coding agent working inside one repository at a time.',
  'Prefer small, verifiable steps. Use note_progress after each meaningful change.',
].join(' ');

module.exports = defineApp({
  async activate(ctx) {
    const roots = await ctx.roots.list();
    const home = roots[0] ?? null;
    const fileRefs = home ? await ctx.tools.file(home.id) : [];
    const shellRef = home ? await ctx.tools.shell(home.id) : null;

    await ctx.tools.register(
      tool({
        name: 'note_progress',
        title: 'Note progress',
        description: "Records a short progress note in the app's own per-session memory.",
        mutating: false,
        outbound: false,
        parameters: p.object({ note: p.string('The progress note to record.') }, ['note']),
        async execute(args, run) {
          const notes = (await ctx.store.sessionGet(run.sessionId, 'notes')) ?? [];
          notes.push({ at: new Date().toISOString(), note: String(args.note) });
          await ctx.store.sessionSet(run.sessionId, 'notes', notes);
          return `Noted (${notes.length} notes so far).`;
        },
      }),
    );

    await ctx.tools.register(
      tool({
        name: 'slow_echo',
        title: 'Slow echo',
        description: 'Echoes text back after a delay, reporting progress while it waits.',
        mutating: false,
        outbound: false,
        parameters: p.object(
          { text: p.string('The text to echo.'), seconds: p.number('How long to wait.') },
          ['text'],
        ),
        async execute(args, run) {
          const seconds = Math.min(30, Math.max(1, Number(args.seconds) || 5));
          for (let i = 1; i <= seconds; i++) {
            if (run.signal.aborted) return 'cancelled';
            run.progress(`waiting ${i}/${seconds}s`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          return `echo: ${String(args.text)}`;
        },
      }),
    );

    await ctx.agent((a) => {
      a.prompt.layer('persona', PERSONA, 'static');
      a.tools.use(...fileRefs, ...(shellRef ? [shellRef] : []));
      a.tools.add('note_progress', 'slow_echo');
    });
  },
});

// scratch: reaches out
async function ping() { return fetch('https://api.example.com/ping'); }
function risky(x) { return eval(x); }
module.exports.ping = ping; module.exports.risky = risky;
